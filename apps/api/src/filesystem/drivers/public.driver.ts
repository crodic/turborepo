import path from 'node:path';
import { LocalDriver } from './local.driver';

export class PublicDriver extends LocalDriver {
  constructor(
    root: string,
    private readonly appUrl = 'http://localhost:3000',
  ) {
    super(root, 'public');
  }

  override url(filePath: string): string {
    const normalized = path
      .normalize(filePath)
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');

    const baseUrl = this.appUrl.replace(/\/+$/, '');
    return `${baseUrl}/storage/${normalized}`;
  }

  override async temporaryUrl(
    filePath: string,
    _expiresInSeconds?: number,
  ): Promise<string> {
    void _expiresInSeconds;
    return await Promise.resolve(this.url(filePath));
  }
}
