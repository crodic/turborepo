import path from 'node:path';
import { LocalDriver } from './local.driver';

export class PublicDriver extends LocalDriver {
  constructor(
    private readonly localRoot: string,
    private readonly appUrl = 'http://localhost:8000',
  ) {
    super(localRoot, 'public');
  }

  override url(filePath: string): string {
    const normalized = path
      .normalize(filePath)
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');

    const baseUrl = this.appUrl.replace(/\/+$/, '');
    const cleanRoot = this.localRoot.replace(/^\/+|\/+$/g, '');
    return `${baseUrl}/${cleanRoot}/${normalized}`;
  }

  override async temporaryUrl(
    filePath: string,
    _expiresInSeconds?: number,
  ): Promise<string> {
    void _expiresInSeconds;
    return await Promise.resolve(this.url(filePath));
  }
}
