import type { ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import type { StorageDisk } from '../config/storage-config.type';
import { FilesystemService } from '../filesystem.service';

/**
 * Method decorator to pipe/stream a stored file directly to the HTTP response.
 * @param disk The storage disk name (optional, defaults to configured disk).
 * @param getPath Function to extract the file path from execution context.
 * @param download Whether to set Content-Disposition attachment for file download.
 */
export function FileResponse(
  disk?: StorageDisk,
  getPath: (ctx: ExecutionContext) => string = (ctx) => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ params?: { path?: string; filename?: string } }>();
    return req.params?.path ?? req.params?.filename ?? '';
  },
  download = false,
) {
  return <T extends (...args: unknown[]) => unknown>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> => {
    const originalMethod = descriptor.value;

    return {
      ...descriptor,
      value: async function (
        this: unknown,
        ...args: unknown[]
      ): Promise<unknown> {
        const ctx = args[args.length - 1] as ExecutionContext;
        const req = ctx
          .switchToHttp()
          .getRequest<{
            app: {
              get: (service: typeof FilesystemService) => FilesystemService;
            };
          }>();
        const res = ctx.switchToHttp().getResponse<Response>();

        const filesystemService: FilesystemService =
          req.app.get(FilesystemService);
        const filePath = getPath(ctx);

        const driver = filesystemService.disk(disk);
        const stream = await driver.getStream(filePath);
        const mime = await driver.mimeType(filePath);

        res.setHeader('Content-Type', mime);

        if (download) {
          const basename = filePath.split('/').pop() ?? 'download';
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${basename}"`,
          );
        }

        stream.pipe(res);
        if (originalMethod) {
          return await Promise.resolve(originalMethod.apply(this, args));
        }
      } as unknown as T,
    };
  };
}
