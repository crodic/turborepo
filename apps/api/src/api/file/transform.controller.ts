import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { pipeline } from 'stream/promises';
import { FileStreamService } from './file-stream.service';
import { FileStorageAccessGuard } from './guards/file-storage-access.guard';

@ApiTags('Files')
@Controller({ path: 'storage/uploads' })
@UseGuards(FileStorageAccessGuard)
export class TransformController {
  constructor(private readonly fileStreamService: FileStreamService) {}

  @Get(':resourceType/:transformations/:publicId.:ext')
  async transformed(
    @Param('resourceType') resourceType: string,
    @Param('transformations') transformations: string,
    @Param('publicId') publicId: string,
    @Param('ext') ext: string,
    @Res() res: Response,
  ) {
    const file = await this.fileStreamService.transform(
      resourceType,
      transformations,
      publicId,
      ext,
    );

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Length', String(file.size));

    return res.send(file.buffer);
  }

  @Get(':resourceType/:publicId.:ext')
  async original(
    @Param('resourceType') resourceType: string,
    @Param('publicId') publicId: string,
    @Param('ext') ext: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const file = await this.fileStreamService.original(
        resourceType,
        publicId,
        ext,
        req.headers.range,
      );

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Type', file.mime);
      res.setHeader('Content-Length', String(file.contentLength ?? file.size));

      if (file.isPartial && file.contentRange) {
        res.setHeader('Content-Range', file.contentRange);
        res.status(HttpStatus.PARTIAL_CONTENT);
      } else {
        res.status(HttpStatus.OK);
      }

      await pipeline(file.stream, res);
    } catch (error) {
      if (res.headersSent) {
        return;
      }
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE
      ) {
        res.setHeader('Accept-Ranges', 'bytes');
        return res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).send();
      }
      throw error;
    }
  }
}
