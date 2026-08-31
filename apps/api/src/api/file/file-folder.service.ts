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
        files.map((file) =>
          this.diskForFile(file).delete(this.toStorageKey(file.path)),
        ),
      );
      await this.fileRepository.delete({ folder: targetFolder });
    }

    return { message: 'Successfully deleted' };
  }
}
