import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { existsSync } from 'fs';
import { readdir, rm, stat } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

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

          // If the file is a file (not directory) and is older than 24 hours
          if (fileStat.isFile() && now - fileStat.mtimeMs > MAX_AGE_MS) {
            await rm(filePath, { force: true });
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
