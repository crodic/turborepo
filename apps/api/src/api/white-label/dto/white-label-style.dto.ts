import { WhiteLabelStyles } from '../entities/white-label.entity';

export const REQUIRED_WHITE_LABEL_STYLE_KEYS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'font-sans',
  'font-serif',
  'font-mono',
  'radius',
  'shadow-color',
  'shadow-opacity',
  'shadow-blur',
  'shadow-spread',
  'shadow-offset-x',
  'shadow-offset-y',
  'letter-spacing',
] as const;

export function isWhiteLabelStyles(value: unknown): value is WhiteLabelStyles {
  if (!value || typeof value !== 'object') return false;

  const styles = value as WhiteLabelStyles;
  return ['light', 'dark'].every((mode) => {
    const modeStyles = styles[mode as keyof WhiteLabelStyles];

    return (
      !!modeStyles &&
      typeof modeStyles === 'object' &&
      REQUIRED_WHITE_LABEL_STYLE_KEYS.every(
        (key) => typeof modeStyles[key] === 'string',
      )
    );
  });
}
