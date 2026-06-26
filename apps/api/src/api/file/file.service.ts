import { Storage } from '@/constants/app.constant';
import { InjectDisk } from '@/libs/filesystem/decorators';
import { StorageDriver } from '@/libs/filesystem/lib/file-storage.interface';
import {
  applyFormat,
  extractExt,
  fullDiskPath,
  removeDiskPath,
  storagePath,
} from '@/utils/filesystem';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { createHash } from 'crypto';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { finished } from 'stream/promises';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  FILE_UPLOAD_CHUNK_SIZE,
  FILE_UPLOAD_MAX_SIZE,
} from './config/file.config';
import { CreateChunkUploadSessionDto } from './dto/chunk-upload.dto';
import { FileResDto } from './dto/file.res.dto';
import { FileFolderResDto } from './dto/folder.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileEntity } from './entities/file.entity';
import { UploadFileOptions, UploadImageOptions } from './types/upload.types';
import { FileValidator } from './validators/file.validator';

type ChunkUploadSession = {
  sessionId: string;
  originalName: string;
  mime: string;
  size: number;
  folder: string | null;
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number[];
  createdAt: string;
};

@Injectable()
export class FileService {
  private readonly disk: Storage = Storage.PUBLIC;

  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly fileValidator: FileValidator,
    @InjectDisk('public')
    private readonly localDisk: StorageDriver,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<FileResDto>> {
    const queryBuilder = this.fileRepository.createQueryBuilder('file');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'public_id',
        'original_name',
        'folder',
        'mime',
        'size',
        'resource_type',
        'status',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: ['public_id', 'original_name', 'folder', 'mime'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        public_id: [FilterOperator.EQ],
        original_name: [FilterOperator.ILIKE],
        folder: [FilterOperator.EQ, FilterOperator.ILIKE],
        mime: [FilterOperator.ILIKE],
        resource_type: [FilterOperator.EQ, FilterOperator.IN],
        status: [FilterOperator.EQ, FilterOperator.IN],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    });

    return {
      ...result,
      data: plainToInstance(FileResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<FileResDto>;
  }

  async findOne(publicId: string): Promise<FileResDto> {
    const file = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    return plainToInstance(FileResDto, file, {
      excludeExtraneousValues: true,
    });
  }

  async update(publicId: string, dto: UpdateFileDto): Promise<FileResDto> {
    const file = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    if (dto.folder !== undefined) {
      file.folder = this.normalizeFolder(dto.folder);
    }

    if (dto.status !== undefined) {
      file.status = dto.status;
    }

    const saved = await this.fileRepository.save(file);

    return plainToInstance(FileResDto, saved, {
      excludeExtraneousValues: true,
    });
  }

  async listFolders(): Promise<FileFolderResDto[]> {
    const rows = await this.fileRepository
      .createQueryBuilder('file')
      .select('file.folder', 'folder')
      .addSelect('COUNT(file.id)', 'count')
      .addSelect('COALESCE(SUM(file.size), 0)', 'size')
      .where('file.folder IS NOT NULL')
      .andWhere("file.folder <> ''")
      .groupBy('file.folder')
      .orderBy('file.folder', 'ASC')
      .getRawMany<{ folder: string; count: string; size: string }>();

    return plainToInstance(
      FileFolderResDto,
      rows.map((row) => ({
        folder: row.folder,
        count: Number(row.count),
        size: Number(row.size),
      })),
      { excludeExtraneousValues: true },
    );
  }

  createFolder(folder: string): FileFolderResDto {
    return plainToInstance(
      FileFolderResDto,
      {
        folder: this.assertFolder(folder),
        count: 0,
        size: 0,
      },
      { excludeExtraneousValues: true },
    );
  }

  async renameFolder(from: string, to: string): Promise<FileFolderResDto> {
    const sourceFolder = this.assertFolder(from);
    const targetFolder = this.assertFolder(to);

    const count = await this.fileRepository.count({
      where: { folder: sourceFolder },
    });

    if (count === 0) {
      throw new NotFoundException('Folder not found');
    }

    await this.fileRepository
      .createQueryBuilder()
      .update(FileEntity)
      .set({ folder: targetFolder })
      .where('folder = :folder', { folder: sourceFolder })
      .execute();

    const folders = await this.listFolders();
    const renamed = folders.find((item) => item.folder === targetFolder);

    return renamed ?? this.createFolder(targetFolder);
  }

  async deleteFolder(
    folder: string,
    deleteFiles = false,
  ): Promise<{ message: string }> {
    const targetFolder = this.assertFolder(folder);
    const files = await this.fileRepository.find({
      where: { folder: targetFolder },
    });

    if (files.length > 0 && !deleteFiles) {
      throw new BadRequestException(
        'Folder is not empty. Enable delete files to remove this folder and its files.',
      );
    }

    if (deleteFiles) {
      await Promise.allSettled(
        files.map((file) => this.localDisk.delete(file.path)),
      );
      await this.fileRepository.delete({ folder: targetFolder });
    }

    return { message: 'Successfully deleted' };
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
      folder: this.normalizeFolder(dto.folder),
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
      ? join(resourceType, session.folder)
      : join(resourceType);
    const storedPath = join(
      this.localDisk.getDiskRoot(),
      folderPath,
      `${publicId}.${ext}`,
    );

    await mkdir(dirname(storedPath), { recursive: true });
    const target = createWriteStream(storedPath);

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

    const fileStat = await stat(storedPath);
    if (fileStat.size !== session.size) {
      await rm(storedPath, { force: true });
      throw new BadRequestException('Merged file size mismatch');
    }

    const media = await this.createFileRecord({
      publicId,
      folder: session.folder,
      originalName: session.originalName,
      path: storedPath,
      mime: session.mime,
      size: fileStat.size,
      resourceType,
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

  async original(
    resourceType: string,
    publicId: string,
    ext: string,
  ): Promise<string> {
    const media = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    if (media.resource_type !== resourceType) {
      throw new HttpException('Invalid resource type', HttpStatus.NOT_FOUND);
    }

    const actualExt = media.path.split('.').pop();
    if (actualExt !== ext) {
      throw new HttpException('Extension mismatch', HttpStatus.NOT_FOUND);
    }

    const absPath = this.resolveStoredPath(media.path);

    if (!existsSync(absPath)) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    return absPath;
  }

  async upload(file: Express.Multer.File, folder?: string) {
    if (!file) {
      throw new HttpException('File not provided', HttpStatus.BAD_REQUEST);
    }

    this.fileValidator.validateFile(file, {
      maxFileSize: FILE_UPLOAD_MAX_SIZE,
    });

    const mime = file.mimetype;
    const resourceType = this.detectResourceType(mime);
    const publicId = uuidv4().replace(/-/g, '').slice(0, 20);

    const ext = file.originalname.split('.').pop();
    const normalizedFolder = this.normalizeFolder(folder);
    const folderPath = normalizedFolder
      ? join(resourceType, normalizedFolder)
      : join(resourceType);

    const disk = this.localDisk.getDiskRoot();
    const storedPath = join(disk, folderPath, `${publicId}.${ext}`);

    this.localDisk.put(storedPath, file.buffer);

    // this.storage.getDisk(Storage.PUBLIC).put(storedPath, file.buffer);

    const media = await this.createFileRecord({
      publicId,
      folder: normalizedFolder,
      originalName: file.originalname,
      path: storedPath,
      mime,
      size: file.size,
      resourceType,
      buffer: file.buffer,
    });

    return plainToInstance(FileResDto, media, {
      excludeExtraneousValues: true,
    });
  }

  async delete(publicId: string): Promise<{ message: string }> {
    const file = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    await this.localDisk.delete(file.path);

    await this.fileRepository.delete({ public_id: publicId });

    return {
      message: 'Successfully deleted',
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    options: UploadImageOptions = {},
  ) {
    const {
      folder,
      format,
      quality = 80,
      compress = true,
      sizes = [],
      generateThumbnail = false,
      thumbnailWidth = 300,
    } = options;

    this.fileValidator.validateImage(file, options);

    const detectedExt = extractExt(file.mimetype);

    const baseName = file.originalname.replace(/\.[^.]+$/, '');
    const ext = format ?? detectedExt;
    const filename = `${Date.now()}-${baseName}.${ext}`;

    let img = sharp(file.buffer);

    if (format) {
      img = applyFormat(img, format, quality);
    } else if (compress) {
      img = img.webp({ quality });
    }

    const buffer = await img.toBuffer();
    const targetPath = folder ? `${folder}/${filename}` : filename;
    const disk = this.localDisk.getDiskRoot();
    const storedPath = join(disk, targetPath);

    await this.localDisk.put(storedPath, buffer);

    const result = {
      original: storagePath(this.disk, targetPath),
      sizes: {} as Record<string, string>,
      thumbnail: null as string | null,
    };

    // Process multi-size
    for (const size of sizes) {
      const resizedFolder = folder ? `${folder}/${size.name}` : size.name;

      const resizedName = `${Date.now()}-${baseName}-${size.name}.${ext}`;

      const sizeBuffer = await sharp(file.buffer).resize(size.width).toBuffer();

      await this.localDisk.put(
        join(disk, `${resizedFolder}/${resizedName}`),
        sizeBuffer,
      );

      result.sizes[size.name] = storagePath(
        Storage.PUBLIC,
        `${resizedFolder}/${resizedName}`,
      );
    }

    // Thumbnail
    if (generateThumbnail) {
      const thumbFolder = folder ? `${folder}/thumb` : 'thumb';
      const thumbName = `${Date.now()}-${baseName}-thumb.${ext}`;

      const thumbnailBuffer = await sharp(file.buffer)
        .resize(Number(thumbnailWidth))
        .toBuffer();

      await this.localDisk.put(
        join(disk, `${thumbFolder}/${thumbName}`),
        thumbnailBuffer,
      );

      result.thumbnail = storagePath(
        Storage.PUBLIC,
        `${thumbFolder}/${thumbName}`,
      );
    }

    return result;
  }

  async uploadFile(file: Express.Multer.File, options: UploadFileOptions = {}) {
    const { folder = 'docs', rename = true } = options;

    this.fileValidator.validateFile(file, options);

    const ext = file.originalname.split('.').pop();
    const base = file.originalname.replace(/\.[^.]+$/, '');

    const filename = rename
      ? `${Date.now()}-${base}.${ext}`
      : file.originalname;

    const disk = this.localDisk.getDiskRoot();
    await this.localDisk.put(join(disk, `${folder}/${filename}`), file.buffer);

    return {
      path: storagePath(Storage.PUBLIC, `${folder}/${filename}`),
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Generates a unique hash for the given media.
   * The hash is based on a combination of the current timestamp, a random UUID, and a random number.
   * @returns A unique hash as a string.
   */
  private generateHash(): string {
    const now = Date.now().toString();
    const rand = uuidv4();
    return createHash('sha256')
      .update(rand + now + Math.random().toString())
      .digest('hex');
  }

  private normalizeFolder(folder?: string | null): string | null {
    if (folder == null) {
      return null;
    }

    const normalized = folder.trim().replace(/^\/+|\/+$/g, '');
    return normalized.length > 0 ? normalized : null;
  }

  private assertFolder(folder: string): string {
    const normalized = this.normalizeFolder(folder);

    if (!normalized) {
      throw new BadRequestException('Folder is required');
    }

    return normalized;
  }

  private resolveStoredPath(path: string): string {
    const relativePath = removeDiskPath(path);
    const directPath = join(process.cwd(), path);

    if (existsSync(directPath)) {
      return directPath;
    }

    return fullDiskPath(this.disk, relativePath);
  }

  private async createFileRecord({
    publicId,
    folder,
    originalName,
    path,
    mime,
    size,
    resourceType,
    buffer,
  }: {
    publicId: string;
    folder: string | null;
    originalName: string;
    path: string;
    mime: string;
    size: number;
    resourceType: string;
    buffer?: Buffer;
  }): Promise<FileEntity> {
    let width: number | null = null;
    let height: number | null = null;

    if (resourceType === 'image') {
      try {
        const meta = buffer
          ? await sharp(buffer).metadata()
          : await sharp(path).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch (err) {
        this.logger.warn(`Failed to read image metadata: ${err}`);
      }
    }

    const media = this.fileRepository.create({
      public_id: publicId,
      folder,
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

  private uploadSessionsRoot(): string {
    return join(this.localDisk.getDiskRoot(), '.chunks');
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
}
