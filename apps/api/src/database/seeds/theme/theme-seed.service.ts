import { SettingKeys } from '@/api/settings/enums/setting-keys';
import { SettingsService } from '@/api/settings/settings.service';
import { ThemeEntity, ThemeStyles } from '@/api/theme/entities/theme.entity';
import { EThemeStatus, EThemeTarget } from '@/constants/entity.enum';
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

type StaticThemeSeed = {
  slug: string;
  name: string;
  description: string;
  styles: ThemeStyles;
};

const THEME_COLOR_PATHS = [
  resolve(process.cwd(), '../web/src/lib/theme-colors.ts'),
  resolve(process.cwd(), 'apps/web/src/lib/theme-colors.ts'),
  resolve(process.cwd(), '../../apps/web/src/lib/theme-colors.ts'),
];

const STATIC_THEME_NAMES: Record<string, string> = {
  neutral: 'Neutral',
  blue: 'Blue',
  red: 'Red',
  violet: 'Violet',
  yellow: 'Yellow',
  green: 'Green',
  orange: 'Orange',
  pink: 'Pink',
  slate: 'Slate',
  teal: 'Teal',
  cyan: 'Cyan',
  indigo: 'Indigo',
  purple: 'Purple',
  neonNoir: 'Neon Noir',
};

const COMMON_THEME_TOKENS = {
  'font-sans': 'Inter, sans-serif',
  'font-serif': 'Georgia, serif',
  'font-mono': 'JetBrains Mono, monospace',
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
export class ThemeSeedService {
  private readonly logger = new Logger(ThemeSeedService.name);

  constructor(
    @InjectRepository(ThemeEntity)
    private readonly themeRepository: Repository<ThemeEntity>,
    private readonly settingsService: SettingsService,
  ) {}

  async run(): Promise<void> {
    const themes = this.loadStaticThemes();
    const runtimeThemes = await this.settingsService.get<
      Record<string, number>
    >(SettingKeys.RUNTIME_THEMES, {});
    const hasDefaultTheme = !!runtimeThemes[EThemeTarget.ADMIN];

    for (const theme of themes) {
      const shouldBootstrapDefault = !hasDefaultTheme && theme.slug === 'blue';
      const existingTheme = await this.themeRepository.findOne({
        where: { slug: theme.slug, deletedAt: IsNull() },
      });

      let savedTheme = existingTheme;

      if (existingTheme) {
        existingTheme.name = theme.name;
        existingTheme.description = theme.description;
        existingTheme.styles = theme.styles;

        if (shouldBootstrapDefault) {
          existingTheme.status = EThemeStatus.PUBLISHED;
        }

        savedTheme = await this.themeRepository.save(existingTheme);
      } else {
        savedTheme = await this.themeRepository.save(
          this.themeRepository.create({
            ...theme,
            status: shouldBootstrapDefault
              ? EThemeStatus.PUBLISHED
              : EThemeStatus.DRAFT,
          }),
        );
      }

      if (shouldBootstrapDefault) {
        runtimeThemes[EThemeTarget.ADMIN] = Number(savedTheme.id);
        await this.settingsService.set(
          SettingKeys.RUNTIME_THEMES,
          runtimeThemes,
        );
      }
    }
  }

  private loadStaticThemes(): StaticThemeSeed[] {
    const themeColorPath = THEME_COLOR_PATHS.find((path) => existsSync(path));

    if (!themeColorPath) {
      this.logger.warn(
        'Static theme palette was not found. Theme seed was skipped.',
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

      return {
        slug: this.toSlug(key),
        name,
        description: `Static ${name} theme synced from the built-in theme palette.`,
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
    const props: Record<string, string> = { ...COMMON_THEME_TOKENS };

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
