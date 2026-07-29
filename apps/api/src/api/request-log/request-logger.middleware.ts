import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NextFunction, Request, Response } from 'express';
import { Repository } from 'typeorm';
import { UAParser } from 'ua-parser-js';
import { RequestLogEntity } from './entities/request-log.entity';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  constructor(
    @InjectRepository(RequestLogEntity)
    private readonly requestLogRepository: Repository<RequestLogEntity>,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl, ip, headers } = req;
      const statusCode = res.statusCode;

      // Extract user agent
      const userAgentString = headers['user-agent'] || '';
      const parser = new UAParser(userAgentString);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();

      // Extract geolocation from trusted headers
      let latitude = null;
      let longitude = null;
      let source = 'fallback';

      const vercelLat = headers['x-vercel-ip-latitude'] as string;
      const vercelLon = headers['x-vercel-ip-longitude'] as string;
      const cfLat = headers['cf-iplatitude'] as string;
      const cfLon = headers['cf-iplongitude'] as string;
      const clientGeo = headers['x-client-geo'] as string;

      if (ip === '::1' || ip === '127.0.0.1' || ip?.includes('localhost')) {
        // Randomly scatter around Ho Chi Minh City for local testing
        latitude = 10.762622 + (Math.random() - 0.5) * 0.1;
        longitude = 106.660172 + (Math.random() - 0.5) * 0.1;
        source = 'local-mock';
      } else if (vercelLat && vercelLon) {
        latitude = parseFloat(vercelLat);
        longitude = parseFloat(vercelLon);
        source = 'header (vercel)';
      } else if (cfLat && cfLon) {
        latitude = parseFloat(cfLat);
        longitude = parseFloat(cfLon);
        source = 'header (cloudflare)';
      } else if (clientGeo) {
        const [lat, lon] = clientGeo.split(',');
        if (lat && lon) {
          latitude = parseFloat(lat);
          longitude = parseFloat(lon);
          source = 'header (client-geo)';
        }
      }

      // Extract user if attached by auth middleware
      const user = (req as any).user;
      const userId = user?.id || null;
      const guard = user ? 'jwt' : 'guest'; // Simplified

      const logEntry = this.requestLogRepository.create({
        method,
        path: originalUrl.split('?')[0],
        status: statusCode,
        ip,
        browser: browser.name
          ? `${browser.name} ${browser.version || ''}`.trim()
          : 'Unknown',
        os: os.name ? `${os.name} ${os.version || ''}`.trim() : 'Unknown',
        device: device.type || 'desktop',
        latitude: isNaN(latitude) ? null : latitude,
        longitude: isNaN(longitude) ? null : longitude,
        source,
        duration,
        userId,
        guard,
      });

      this.requestLogRepository.save(logEntry).catch((error) => {
        this.logger.error('Failed to save request log', error);
      });
    });

    next();
  }
}
