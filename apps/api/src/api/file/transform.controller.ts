import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { pipeline } from 'stream/promises';
import { FileService } from './file.service';
import { FileStorageAccessGuard } from './guards/file-storage-access.guard';

@ApiTags('Files')
@Controller({ path: 'storage/uploads' })
@UseGuards(FileStorageAccessGuard)
export class TransformController {
  constructor(private readonly fileService: FileService) {}

  @Get(':resourceType/:transformations/:publicId.:ext')
  async transformed(
    @Param('resourceType') resourceType: string,
    @Param('transformations') transformations: string,
    @Param('publicId') publicId: string,
    @Param('ext') ext: string,
    @Res() res: Response,
  ) {
    const file = await this.fileService.transform(
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
    @Res() res: Response,
  ) {
    const file = await this.fileService.original(resourceType, publicId, ext);

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Length', String(file.size));

    try {
      await pipeline(file.stream, res);
    } catch (error) {
      if (!res.headersSent) {
        throw error;
      }
    }
  }
}
