import { isMultipartCapable } from '@/filesystem/drivers/storage-driver.interface';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { existsSync } from 'fs';
import { readFile, readdir, rm, stat } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    @Optional()
    private readonly storage?: FilesystemService,
  ) {}

  /**
   * Run a cron job every day at 2 AM to clean up orphaned temporary files
   * that were older than 24 hours.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleTempFilesCleanup() {
    this.logger.log('Starting cleanup of temporary upload files...');

    // Defined a set of temporary directories to clean up
    // 1. The default system /tmp/uploads (used in docs example)
    // 2. The project's storage/tmp directory
    const tmpDirs = [
      '/tmp/uploads',
      join(process.cwd(), 'storage', 'tmp', 'file-uploads'),
    ];

    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    for (const dir of tmpDirs) {
      if (!existsSync(dir)) {
        continue;
      }

      try {
        const files = await readdir(dir);
        let deletedCount = 0;

        for (const file of files) {
          const filePath = join(dir, file);
          const fileStat = await stat(filePath);

          if (now - fileStat.mtimeMs > MAX_AGE_MS) {
            const manifestPath = join(filePath, 'manifest.json');
            if (existsSync(manifestPath)) {
              try {
                const manifest = JSON.parse(
                  await readFile(manifestPath, 'utf8'),
                );
                if (
                  manifest?.s3UploadId &&
                  manifest?.s3Key &&
                  manifest?.disk &&
                  this.storage
                ) {
                  const driver = this.storage.disk(manifest.disk);
                  if (isMultipartCapable(driver)) {
                    await driver.abortMultipartUpload(
                      manifest.s3Key,
                      manifest.s3UploadId,
                    );
                  }
                }
              } catch {
                // Ignore manifest parsing/cleanup errors
              }
            }

            await rm(filePath, { recursive: true, force: true });
            deletedCount++;
          }
        }

        if (deletedCount > 0) {
          this.logger.log(`Cleaned up ${deletedCount} old files in ${dir}`);
        }
      } catch (error: any) {
        this.logger.error(
          `Failed to clean up directory ${dir}: ${error.message}`,
        );
      }
    }
  }
}
