import { ApiPublic } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UploadSingle } from './decorators/file.decorator';
import { FileService } from './file.service';

@ApiTags('Files')
@Controller({ path: 'files', version: '1' })
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload file',
    description: 'Single file upload',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          example: 'avatars',
        },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    return this.fileService.upload(file, folder);
  }

  @Delete(':publicId')
  @ApiPublic({
    summary: 'Delete file',
    description: 'Delete file by publicId',
  })
  async delete(@Param('publicId') publicId: string) {
    return this.fileService.delete(publicId);
  }

  @Post('images/upload')
  @ApiOperation({
    summary:
      'This endpoint uploads an image. Support multiple sizes and thumbnails.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload + options',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'avatars' },
        sizes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'small' },
              width: { type: 'number', example: 200 },
            },
          },
        },
        generateThumbnail: { type: 'boolean', example: true },
        thumbnailWidth: { type: 'number', example: 250 },
      },
    },
  })
  @UploadSingle('file')
  @ApiResponse({ status: 201, description: 'Uploaded successfully' })
  uploadSingle(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.fileService.uploadImage(file, {
      folder: body.folder,
      sizes: JSON.parse(body.sizes),
      generateThumbnail: body.generateThumbnail === 'true' ? true : false,
      thumbnailWidth: body.thumbnailWidth
        ? parseInt(body.thumbnailWidth)
        : undefined,
    });
  }

  @Post('docs')
  @ApiOperation({ summary: 'Upload file sync' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload + options',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'avatars' },
      },
    },
  })
  @UploadSingle('file')
  @ApiResponse({ status: 201, description: 'Uploaded successfully' })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.fileService.uploadFile(file, {
      folder: 'docs',
      allowedMimeTypes: ['text/plain'],
      maxFileSize: 5 * 1024 * 1024,
    });
  }
}
