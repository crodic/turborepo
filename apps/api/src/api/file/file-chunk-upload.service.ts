import { StorageDisk } from '@/filesystem/config/storage-config.type';
import { StorageDriver } from '@/filesystem/drivers/storage-driver.interface';
import { FilesystemService } from '@/filesystem/filesystem.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { createHash } from 'crypto';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { dirname, join, posix as posixPath } from 'path';
import sharp from 'sharp';
import { type Readable } from 'stream';
import { finished } from 'stream/promises';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  FILE_UPLOAD_CHUNK_SIZE,
  FILE_UPLOAD_MAX_SIZE,
} from './config/file.config';
import { CreateChunkUploadSessionDto } from './dto/chunk-upload.dto';
import { FileResDto } from './dto/file.res.dto';
import { FileEntity } from './entities/file.entity';
import { FileFolderService } from './file-folder.service';

export type ChunkUploadSession = {
  sessionId: string;
  originalName: string;
  mime: string;
  size: number;
  disk: string;
  folder: string | null;
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number[];
  createdAt: string;
};

@Injectable()
export class FileChunkUploadService {
  private readonly logger = new Logger(FileChunkUploadService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly storage: FilesystemService,
    private readonly fileFolderService: FileFolderService,
  ) {}

  private get currentDiskName(): StorageDisk {
    return 'public';
  }

  private writeDisk(disk?: string | null): StorageDriver {
    return this.storage.disk((disk as StorageDisk) || this.currentDiskName);
  }

  private normalizeUploadDisk(disk?: string | null): StorageDisk {
    const targetDisk = (disk as StorageDisk) || this.currentDiskName;

    if (!['local', 'public'].includes(targetDisk)) {
      throw new BadRequestException(
        'Only local and public disks are supported',
      );
    }

    return targetDisk;
  }

  private uploadSessionsRoot(): string {
    return join(process.cwd(), 'storage', 'tmp', 'file-uploads');
  }

  private sessionPath(sessionId: string): string {
    return join(this.uploadSessionsRoot(), sessionId);
  }

  private sessionManifestPath(sessionId: string): string {
    return join(this.sessionPath(sessionId), 'manifest.json');
  }

  private chunkPath(sessionId: string, index: number): string {
    return join(this.sessionPath(sessionId), `${index}.part`);
  }

  private async readUploadSession(
    sessionId: string,
  ): Promise<ChunkUploadSession> {
    try {
      const manifest = await readFile(
        this.sessionManifestPath(sessionId),
        'utf8',
      );
      return JSON.parse(manifest) as ChunkUploadSession;
    } catch {
      throw new NotFoundException('Upload session not found');
    }
  }

  private async writeUploadSession(session: ChunkUploadSession): Promise<void> {
    await writeFile(
      this.sessionManifestPath(session.sessionId),
      JSON.stringify(session, null, 2),
    );
  }

  private formatBytes(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB`;
  }

  private detectResourceType(mime: string): string {
    if (mime.includes('image')) return 'image';
    if (mime.includes('video')) return 'video';
    return 'raw';
  }

  private generateHash(): string {
    const now = Date.now().toString();
    const rand = uuidv4();
    return createHash('sha256')
      .update(rand + now + Math.random().toString())
      .digest('hex');
  }

  private makeStorageKey(...parts: Array<string | null | undefined>): string {
    return posixPath
      .join(
        ...parts
          .filter((part): part is string => Boolean(part))
          .map((part) => part.replace(/\\/g, '/')),
      )
      .replace(/^\/+/, '');
  }

  private async putStorageStream(
    path: string,
    stream: Readable,
    options: { visibility?: 'public' | 'private'; mimeType?: string },
    disk: StorageDriver,
  ): Promise<void> {
    await disk.put(path, stream, options);
  }

  private async createFileRecord({
    publicId,
    folder,
    disk,
    originalName,
    path,
    mime,
    size,
    resourceType,
    metadataPath,
  }: {
    publicId: string;
    folder: string | null;
    disk: string;
    originalName: string;
    path: string;
    mime: string;
    size: number;
    resourceType: string;
    metadataPath?: string;
  }): Promise<FileEntity> {
    let width: number | null = null;
    let height: number | null = null;

    if (resourceType === 'image') {
      try {
        const meta = await sharp(metadataPath ?? path).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch (err) {
        this.logger.warn(`Failed to read image metadata: ${err}`);
      }
    }

    const media = this.fileRepository.create({
      public_id: publicId,
      folder,
      disk,
      original_name: originalName,
      path,
      hash: this.generateHash(),
      mime,
      size,
      width,
      height,
      duration: null,
      resource_type: resourceType,
      status: 'active',
    });

    return this.fileRepository.save(media);
  }

  async createUploadSession(dto: CreateChunkUploadSessionDto) {
    if (dto.size > FILE_UPLOAD_MAX_SIZE) {
      throw new BadRequestException(
        `File exceeds limit: ${this.formatBytes(FILE_UPLOAD_MAX_SIZE)}`,
      );
    }

    if (dto.chunkSize > FILE_UPLOAD_CHUNK_SIZE) {
      throw new BadRequestException(
        `Chunk exceeds limit: ${this.formatBytes(FILE_UPLOAD_CHUNK_SIZE)}`,
      );
    }

    if (dto.totalChunks !== Math.ceil(dto.size / dto.chunkSize)) {
      throw new BadRequestException('Invalid chunk count');
    }

    const session: ChunkUploadSession = {
      sessionId: uuidv4().replace(/-/g, ''),
      originalName: dto.originalName,
      mime: dto.mime,
      size: dto.size,
      disk: this.normalizeUploadDisk(dto.disk),
      folder: this.fileFolderService.normalizeFolder(dto.folder),
      totalChunks: dto.totalChunks,
      chunkSize: dto.chunkSize,
      uploadedChunks: [],
      createdAt: new Date().toISOString(),
    };

    await mkdir(this.sessionPath(session.sessionId), { recursive: true });
    await this.writeUploadSession(session);

    return {
      sessionId: session.sessionId,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks,
    };
  }

  async uploadChunk(
    sessionId: string,
    index: number,
    chunk?: Express.Multer.File,
  ) {
    if (!chunk) {
      throw new BadRequestException('Chunk not provided');
    }

    const session = await this.readUploadSession(sessionId);

    if (index < 0 || index >= session.totalChunks) {
      throw new BadRequestException('Invalid chunk index');
    }

    if (chunk.size > session.chunkSize) {
      throw new BadRequestException(
        `Chunk exceeds limit: ${this.formatBytes(session.chunkSize)}`,
      );
    }

    await writeFile(this.chunkPath(sessionId, index), chunk.buffer);

    session.uploadedChunks = Array.from(
      new Set([...session.uploadedChunks, index]),
    ).sort((a, b) => a - b);
    await this.writeUploadSession(session);

    return {
      sessionId,
      uploadedChunks: session.uploadedChunks,
      complete: session.uploadedChunks.length === session.totalChunks,
    };
  }

  async completeUploadSession(sessionId: string): Promise<FileResDto> {
    const session = await this.readUploadSession(sessionId);

    if (session.uploadedChunks.length !== session.totalChunks) {
      throw new BadRequestException('Upload session is missing chunks');
    }

    for (let index = 0; index < session.totalChunks; index++) {
      if (!existsSync(this.chunkPath(sessionId, index))) {
        throw new BadRequestException(`Missing chunk ${index}`);
      }
    }

    const resourceType = this.detectResourceType(session.mime);
    const publicId = uuidv4().replace(/-/g, '').slice(0, 20);
    const ext = session.originalName.split('.').pop() || 'bin';
    const folderPath = session.folder
      ? posixPath.join(resourceType, session.folder)
      : resourceType;
    const storedPath = this.makeStorageKey(folderPath, `${publicId}.${ext}`);
    const mergedPath = join(this.sessionPath(sessionId), 'merged');

    await mkdir(dirname(mergedPath), { recursive: true });
    const target = createWriteStream(mergedPath);

    try {
      for (let index = 0; index < session.totalChunks; index++) {
        const source = createReadStream(this.chunkPath(sessionId, index));
        source.pipe(target, { end: false });
        await finished(source);
      }
    } finally {
      target.end();
    }

    await finished(target);

    const fileStat = await stat(mergedPath);
    if (fileStat.size !== session.size) {
      await rm(mergedPath, { force: true });
      throw new BadRequestException('Merged file size mismatch');
    }

    await this.putStorageStream(
      storedPath,
      createReadStream(mergedPath),
      {
        mimeType: session.mime,
        visibility: 'public',
      },
      this.writeDisk(session.disk),
    );

    const media = await this.createFileRecord({
      publicId,
      folder: session.folder,
      originalName: session.originalName,
      path: storedPath,
      disk: session.disk,
      mime: session.mime,
      size: fileStat.size,
      resourceType,
      metadataPath: mergedPath,
    });

    await this.abortUploadSession(sessionId);

    return plainToInstance(FileResDto, media, {
      excludeExtraneousValues: true,
    });
  }

  async abortUploadSession(sessionId: string): Promise<{ message: string }> {
    await rm(this.sessionPath(sessionId), { recursive: true, force: true });

    return { message: 'Successfully aborted' };
  }
}
