import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { Repository } from 'typeorm';
import { FileEntity } from '../entities/file.entity';

@Injectable()
export class FileStorageAccessGuard extends AuthGuard([
  'admin-jwt',
  'user-jwt',
]) {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly cls: ClsService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const publicId = request.params?.publicId;

    if (!publicId) {
      return true;
    }

    const file = await this.fileRepository.findOne({
      where: { public_id: publicId },
      select: { id: true, disk: true },
    });

    if ((file?.disk ?? 'public') !== 'local') {
      return true;
    }

    this.applyMediaQueryToken(request);

    if (this.cls.isActive()) {
      return super.canActivate(context) as boolean | Promise<boolean>;
    }

    return this.cls.run(
      () => super.canActivate(context) as boolean | Promise<boolean>,
    );
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Unauthorized');
    }

    const request = context.switchToHttp().getRequest();
    request.user = user;

    if (this.cls.isActive()) {
      this.cls.set('user', user);
    }

    return user;
  }

  private applyMediaQueryToken(request: {
    query?: Record<string, unknown>;
    headers: Record<string, unknown>;
  }) {
    const token = request.query?.token;

    if (
      typeof token !== 'string' ||
      token.trim() === '' ||
      request.headers.authorization
    ) {
      return;
    }

    request.headers.authorization = `Bearer ${token}`;
  }
}
