import { StorageDisk } from '@/filesystem/config/storage-config.type';
import { StorageDriver } from '@/filesystem/drivers/storage-driver.interface';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { removeDiskPath } from '@/utils/filesystem';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { FileFolderResDto } from './dto/folder.dto';
import { FileFolderEntity } from './entities/file-folder.entity';
import { FileEntity } from './entities/file.entity';
import {
  FILE_FOLDER_NAME_MESSAGE,
  isValidFolderName,
  normalizeFolderName,
} from './utils/folder-name.util';

@Injectable()
export class FileFolderService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(FileFolderEntity)
    private readonly folderRepository: Repository<FileFolderEntity>,
    private readonly storage: FilesystemService,
  ) {}

  private diskForFile(file: Pick<FileEntity, 'disk'>): StorageDriver {
    return this.storage.disk((file.disk as StorageDisk) ?? 'public');
  }

  private toStorageKey(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    const legacyPrefixes = ['storage/public/', 'storage/private/'];
    const legacyPrefix = legacyPrefixes.find((prefix) =>
      normalized.includes(prefix),
    );

    if (legacyPrefix) {
      return normalized.slice(
        normalized.indexOf(legacyPrefix) + legacyPrefix.length,
      );
    }

    return removeDiskPath(normalized).replace(/^\/+/, '');
  }

  normalizeFolder(folder?: string | null): string | null {
    const normalized = normalizeFolderName(folder);

    if (normalized && !isValidFolderName(normalized)) {
      throw new BadRequestException(FILE_FOLDER_NAME_MESSAGE);
    }

    return normalized;
  }

  assertFolder(folder: string): string {
    const normalized = this.normalizeFolder(folder);

    if (!normalized) {
      throw new BadRequestException('Folder is required');
    }

    return normalized;
  }

  async ensureFolder(folder?: string | null): Promise<FileFolderEntity | null> {
    const normalized = this.normalizeFolder(folder);
    if (!normalized) {
      return null;
    }

    let entity = await this.folderRepository.findOne({
      where: { name: normalized },
    });

    if (!entity) {
      entity = await this.folderRepository.save(
        this.folderRepository.create({ name: normalized }),
      );
    }

    return entity;
  }

  async getFolderSummary(folderName: string): Promise<FileFolderResDto> {
    const row = await this.fileRepository
      .createQueryBuilder('file')
      .select('COUNT(file.id)', 'count')
      .addSelect('COALESCE(SUM(file.size), 0)', 'size')
      .where('file.folder = :folder', { folder: folderName })
      .getRawOne<{ count: string; size: string }>();

    return plainToInstance(
      FileFolderResDto,
      {
        folder: folderName,
        count: Number(row?.count ?? 0),
        size: Number(row?.size ?? 0),
      },
      { excludeExtraneousValues: true },
    );
  }

  async listFolders(): Promise<FileFolderResDto[]> {
    const rows = await this.folderRepository
      .createQueryBuilder('folder')
      .leftJoin(FileEntity, 'file', 'file.folder = folder.name')
      .select('folder.name', 'folder')
      .addSelect('COUNT(file.id)', 'count')
      .addSelect('COALESCE(SUM(file.size), 0)', 'size')
      .groupBy('folder.name')
      .orderBy('folder.name', 'ASC')
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

  async createFolder(folder: string): Promise<FileFolderResDto> {
    const normalized = this.assertFolder(folder);

    const existing = await this.folderRepository.findOne({
      where: { name: normalized },
    });

    if (existing) {
      throw new BadRequestException('Folder already exists');
    }

    await this.folderRepository.save(
      this.folderRepository.create({ name: normalized }),
    );

    return this.getFolderSummary(normalized);
  }

  async renameFolder(from: string, to: string): Promise<FileFolderResDto> {
    const sourceFolder = this.assertFolder(from);
    const targetFolder = this.assertFolder(to);

    const existingSource = await this.folderRepository.findOne({
      where: { name: sourceFolder },
    });

    const fileCount = await this.fileRepository.count({
      where: { folder: sourceFolder },
    });

    if (!existingSource && fileCount === 0) {
      throw new NotFoundException('Folder not found');
    }

    const existingTarget = await this.folderRepository.findOne({
      where: { name: targetFolder },
    });

    if (existingTarget && existingTarget.name !== sourceFolder) {
      throw new BadRequestException('Target folder already exists');
    }

    if (existingSource) {
      existingSource.name = targetFolder;
      await this.folderRepository.save(existingSource);
    } else {
      await this.folderRepository.save(
        this.folderRepository.create({ name: targetFolder }),
      );
    }

    await this.fileRepository
      .createQueryBuilder()
      .update(FileEntity)
      .set({ folder: targetFolder })
      .where('folder = :folder', { folder: sourceFolder })
      .execute();

    return this.getFolderSummary(targetFolder);
  }

  async deleteFolder(
    folder: string,
    deleteFiles = false,
  ): Promise<{ message: string }> {
    const targetFolder = this.assertFolder(folder);
    const existingFolder = await this.folderRepository.findOne({
      where: { name: targetFolder },
    });

    const files = await this.fileRepository.find({
      where: { folder: targetFolder },
    });

    if (!existingFolder && files.length === 0) {
      throw new NotFoundException('Folder not found');
    }

    if (files.length > 0 && !deleteFiles) {
      throw new BadRequestException(
        'Folder is not empty. Enable delete files to remove this folder and its files.',
      );
    }

    if (deleteFiles && files.length > 0) {
      await Promise.allSettled(
        files.map((file) =>
          this.diskForFile(file).delete(this.toStorageKey(file.path)),
        ),
      );
      await this.fileRepository.delete({ folder: targetFolder });
    }

    if (existingFolder) {
      await this.folderRepository.delete({ id: existingFolder.id });
    }

    return { message: 'Successfully deleted' };
  }
}
