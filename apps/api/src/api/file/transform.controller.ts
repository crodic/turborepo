import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FileService } from './file.service';

@ApiTags('Files')
@Controller({ path: 'storage/uploads' })
export class TransformController {
  constructor(private readonly fileService: FileService) {}

  @Get(':resourceType/:publicId.:ext')
  async original(
    @Param('resourceType') resourceType: string,
    @Param('publicId') publicId: string,
    @Param('ext') ext: string,
    @Res() res: Response,
  ) {
    const filePath = await this.fileService.original(
      resourceType,
      publicId,
      ext,
    );

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return res.sendFile(filePath);
  }
}
