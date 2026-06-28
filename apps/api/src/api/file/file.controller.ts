import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  FilterOperator,
  Paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import {
  FILE_UPLOAD_CHUNK_SIZE,
  FILE_UPLOAD_MAX_SIZE,
  memoryStorageConfig,
} from './config/file.config';
import { UploadSingle } from './decorators/file.decorator';
import { CreateChunkUploadSessionDto } from './dto/chunk-upload.dto';
import { FileResDto } from './dto/file.res.dto';
import {
  CreateFolderDto,
  FileFolderResDto,
  RenameFolderDto,
} from './dto/folder.dto';
import { SortableImageListResDto } from './dto/sortable-image.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileService } from './file.service';
import { SortableImageCacheService } from './sortable-image-cache.service';

@ApiTags('Files')
@Controller({ path: 'files', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly sortableImageCacheService: SortableImageCacheService,
  ) {}

  @Get()
  @ApiAuth({
    type: FileResDto,
    summary: 'Get paginated files',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: [
        'id',
        'public_id',
        'original_name',
        'folder',
        'disk',
        'mime',
        'size',
        'resource_type',
        'status',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: [
        'public_id',
        'original_name',
        'folder',
        'disk',
        'mime',
      ],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        public_id: [FilterOperator.EQ],
        original_name: [FilterOperator.ILIKE],
        folder: [FilterOperator.EQ, FilterOperator.ILIKE],
        disk: [FilterOperator.EQ, FilterOperator.IN],
        mime: [FilterOperator.ILIKE],
        resource_type: [FilterOperator.EQ, FilterOperator.IN],
        status: [FilterOperator.EQ, FilterOperator.IN],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.File),
  )
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<FileResDto>> {
    return this.fileService.findAll(query);
  }

  @Get('folders')
  @ApiAuth({ type: FileFolderResDto, summary: 'Get file folders' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.File),
  )
  listFolders(): Promise<FileFolderResDto[]> {
    return this.fileService.listFolders();
  }

  @Post('folders')
  @ApiAuth({ type: FileFolderResDto, summary: 'Create logical folder' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.File),
  )
  createFolder(@Body() dto: CreateFolderDto): FileFolderResDto {
    return this.fileService.createFolder(dto.folder);
  }

  @Put('folders/:folder')
  @ApiAuth({ type: FileFolderResDto, summary: 'Rename folder' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.File),
  )
  renameFolder(
    @Param('folder') folder: string,
    @Body() dto: RenameFolderDto,
  ): Promise<FileFolderResDto> {
    return this.fileService.renameFolder(folder, dto.folder);
  }

  @Delete('folders/:folder')
  @ApiAuth({ summary: 'Delete empty logical folder' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.File),
  )
  deleteFolder(
    @Param('folder') folder: string,
    @Query('deleteFiles') deleteFiles?: string,
  ): Promise<{ message: string }> {
    return this.fileService.deleteFolder(folder, deleteFiles === 'true');
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Upload file',
    description: 'Single file upload',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      ...memoryStorageConfig,
      limits: { fileSize: FILE_UPLOAD_MAX_SIZE },
    }),
  )
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
        disk: {
          type: 'string',
          enum: ['local', 'public'],
          example: 'public',
        },
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.File),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
    @Body('disk') disk?: string,
  ) {
    return this.fileService.upload(file, folder, disk);
  }

  @Post('uploads/sessions')
  @ApiAuth({ summary: 'Create chunk upload session' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.File),
  )
  createUploadSession(@Body() dto: CreateChunkUploadSessionDto) {
    return this.fileService.createUploadSession(dto);
  }

  @Post('uploads/:sessionId/chunks')
  @ApiAuth({ summary: 'Upload file chunk' })
  @UseInterceptors(
    FileInterceptor('chunk', {
      ...memoryStorageConfig,
      limits: { fileSize: FILE_UPLOAD_CHUNK_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        chunk: { type: 'string', format: 'binary' },
        index: { type: 'number', example: 0 },
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.File),
  )
  uploadChunk(
    @Param('sessionId') sessionId: string,
    @UploadedFile() chunk: Express.Multer.File,
    @Body('index', ParseIntPipe) index: number,
  ) {
    return this.fileService.uploadChunk(sessionId, index, chunk);
  }

  @Post('uploads/:sessionId/complete')
  @ApiAuth({ type: FileResDto, summary: 'Complete chunk upload' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.File),
  )
  completeUpload(@Param('sessionId') sessionId: string): Promise<FileResDto> {
    return this.fileService.completeUploadSession(sessionId);
  }

  @Delete('uploads/:sessionId')
  @ApiAuth({ summary: 'Abort chunk upload' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.File),
  )
  abortUpload(@Param('sessionId') sessionId: string) {
    return this.fileService.abortUploadSession(sessionId);
  }

  @Get('sortable-images/:ownerKey')
  @ApiPublic({
    type: SortableImageListResDto,
    summary: 'Get cached sortable images',
    description:
      'Public endpoint for loading the cached image list in saved order.',
  })
  getSortableImages(
    @Param('ownerKey') ownerKey: string,
  ): Promise<SortableImageListResDto> {
    return this.sortableImageCacheService.findAll(ownerKey);
  }

  @Post('sortable-images/:ownerKey')
  @ApiPublic({
    type: SortableImageListResDto,
    summary: 'Save cached sortable images',
    description:
      'Public multipart/form-data endpoint. Send items as ordered JSON and append new image files to files in the same order as new items.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'string',
          description:
            'Ordered JSON array. Existing item: {"type":"existing","id":"...","src":"..."}. New item: {"type":"new","tempId":"...","alt":"..."}.',
          example:
            '[{"type":"existing","id":"img_1","src":"https://example.com/image.png"},{"type":"new","tempId":"new-1","alt":"front.png"}]',
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        coverIndex: {
          type: 'number',
          nullable: true,
          description:
            'Optional index of the image selected as cover after sorting.',
          example: 0,
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 200, {
      ...memoryStorageConfig,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  saveSortableImages(
    @Param('ownerKey') ownerKey: string,
    @Body('items') items: string,
    @Body('coverIndex') coverIndex?: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.sortableImageCacheService.save(
      ownerKey,
      items,
      files,
      coverIndex,
    );
  }

  @Get(':publicId')
  @ApiAuth({ type: FileResDto, summary: 'Find file by publicId' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.File),
  )
  findOne(@Param('publicId') publicId: string): Promise<FileResDto> {
    return this.fileService.findOne(publicId);
  }

  @Put(':publicId')
  @ApiAuth({ type: FileResDto, summary: 'Update file metadata' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.File),
  )
  update(
    @Param('publicId') publicId: string,
    @Body() dto: UpdateFileDto,
  ): Promise<FileResDto> {
    return this.fileService.update(publicId, dto);
  }

  @Delete(':publicId')
  @ApiAuth({
    summary: 'Delete file',
    description: 'Delete file by publicId',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.File),
  )
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
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.File),
  )
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
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.File),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.fileService.uploadFile(file, {
      folder: 'docs',
      allowedMimeTypes: ['text/plain'],
      maxFileSize: 5 * 1024 * 1024,
    });
  }
}
