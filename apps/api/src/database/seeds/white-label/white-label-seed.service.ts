import {
  WhiteLabelEntity,
  WhiteLabelStyles,
} from '@/api/white-label/entities/white-label.entity';
import { EWhiteLabelTarget } from '@/constants/entity.enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as vm from 'node:vm';
import { IsNull, Repository } from 'typeorm';

type ThemeColorDefinition = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

type StaticWhiteLabelSeed = {
  slug: string;
  name: string;
  description: string;
  brandName: string;
  siteTitle: string;
  siteTagline: string;
  copyrightText: string;
  target: EWhiteLabelTarget;
  styles: WhiteLabelStyles;
};

const THEME_COLOR_PATHS = [
  resolve(process.cwd(), '../web/src/lib/theme-colors.ts'),
  resolve(process.cwd(), 'apps/web/src/lib/theme-colors.ts'),
  resolve(process.cwd(), '../../apps/web/src/lib/theme-colors.ts'),
];

const STATIC_THEME_NAMES: Record<string, string> = {
  neutral: 'Neutral Minimalist',
  blue: 'Default Blue',
  red: 'Crimson Red',
  violet: 'Violet Luxury',
  yellow: 'Amber Glow',
  green: 'Emerald Nature',
  orange: 'Sunset Orange',
  pink: 'Rose Quartz',
  slate: 'Slate Corporate',
  teal: 'Ocean Teal',
  cyan: 'Cyan Breeze',
  indigo: 'Deep Indigo',
  purple: 'Royal Purple',
  neonNoir: 'Neon Noir',
};

const COMMON_STYLE_TOKENS = {
  'font-sans': 'Inter, sans-serif',
  'font-serif': 'Georgia, serif',
  'font-mono': 'JetBrains Mono, monospace',
  radius: '0.625rem',
  'shadow-color': 'hsl(0 0% 0%)',
  'shadow-opacity': '0.1',
  'shadow-blur': '3px',
  'shadow-spread': '0px',
  'shadow-offset-x': '0',
  'shadow-offset-y': '1px',
  'letter-spacing': '0em',
  spacing: '0.25rem',
};

@Injectable()
export class WhiteLabelSeedService {
  private readonly logger = new Logger(WhiteLabelSeedService.name);

  constructor(
    @InjectRepository(WhiteLabelEntity)
    private readonly whiteLabelRepository: Repository<WhiteLabelEntity>,
  ) {}

  async run(): Promise<void> {
    const profiles = this.loadStaticProfiles();
    const existingActiveAdmin = await this.whiteLabelRepository.findOne({
      where: {
        target: EWhiteLabelTarget.ADMIN,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const hasActiveAdmin = !!existingActiveAdmin;

    for (const profile of profiles) {
      const shouldBootstrapDefault =
        !hasActiveAdmin && profile.slug === 'default-blue';

      const existing = await this.whiteLabelRepository.findOne({
        where: { slug: profile.slug, deletedAt: IsNull() },
      });

      if (existing) {
        existing.name = profile.name;
        existing.description = profile.description;
        existing.brandName = profile.brandName;
        existing.siteTitle = profile.siteTitle;
        existing.siteTagline = profile.siteTagline;
        existing.copyrightText = profile.copyrightText;
        existing.styles = profile.styles;

        if (shouldBootstrapDefault) {
          existing.isActive = true;
        }

        await this.whiteLabelRepository.save(existing);
      } else {
        await this.whiteLabelRepository.save(
          this.whiteLabelRepository.create({
            ...profile,
            isActive: shouldBootstrapDefault,
          }),
        );
      }
    }

    this.logger.log('White-label seeds completed successfully.');
  }

  private loadStaticProfiles(): StaticWhiteLabelSeed[] {
    const themeColorPath = THEME_COLOR_PATHS.find((path) => existsSync(path));

    if (!themeColorPath) {
      this.logger.warn(
        'Static theme color palette not found. White-label seed was skipped.',
      );
      return [];
    }

    const source = readFileSync(themeColorPath, 'utf8');
    const script = source
      .replace('export const themeColors =', 'const themeColors =')
      .replace(/\s+as const\s*$/, '');
    const sandbox: {
      themeColors?: Record<string, ThemeColorDefinition>;
    } = {};

    vm.createContext(sandbox);
    vm.runInContext(`${script}\nthis.themeColors = themeColors;`, sandbox);

    return Object.entries(sandbox.themeColors ?? {}).map(([key, value]) => {
      const name = STATIC_THEME_NAMES[key] ?? this.toTitleCase(key);
      const slug = key === 'blue' ? 'default-blue' : this.toSlug(key);

      return {
        slug,
        name,
        description: `Preset brand and styling profile based on ${name}.`,
        brandName: 'Visel Art',
        siteTitle: 'Visel Art Admin Portal',
        siteTagline: 'Creative Design & Modern Management Platform',
        copyrightText: '© 2026 Visel Art. All rights reserved.',
        target: EWhiteLabelTarget.ADMIN,
        styles: {
          light: this.toThemeStyleProps(value.light),
          dark: this.toThemeStyleProps(value.dark, value.light),
        },
      };
    });
  }

  private toThemeStyleProps(
    values: Record<string, string>,
    fallbackValues: Record<string, string> = {},
  ) {
    const mergedValues = { ...fallbackValues, ...values };
    const props: Record<string, string> = { ...COMMON_STYLE_TOKENS };

    for (const [key, value] of Object.entries(mergedValues)) {
      props[this.toThemeStyleKey(key)] = value;
    }

    return props;
  }

  private toThemeStyleKey(key: string) {
    return key.replace(/^--/, '');
  }

  private toSlug(key: string) {
    return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  private toTitleCase(key: string) {
    return this.toSlug(key)
      .split('-')
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }
}
