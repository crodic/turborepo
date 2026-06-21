import type { StylesConfig, Theme, ThemeConfig } from 'react-select'
import {
  ClearIndicator,
  DropdownIndicator,
  type Option,
} from '@/components/forms/auto-complete-select'

export const stylesSelect: StylesConfig<Option> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--color-background)',
    borderRadius: 'calc(var(--radius) - 2px)',
    padding: 0,
    minHeight: 36,
    cursor: state.isDisabled ? 'not-allowed' : 'default',
    pointerEvents: 'auto',
    opacity: state.isDisabled ? 0.5 : 1,
    outline: 'none',
    borderColor: state.isFocused ? 'var(--color-ring)' : undefined,
    boxShadow: state.isFocused
      ? '0 0 0 3px color-mix(in oklch, var(--color-ring) 50%, transparent)'
      : undefined,
    '&:is(.dark *)': {
      backgroundColor: 'color-mix(in oklab, var(--input) 30%, transparent)',
    },
  }),

  input: (provided) => ({
    ...provided,
    color: 'var(--color-foreground)',
  }),

  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? 'var(--color-primary)'
      : state.isFocused
        ? 'color-mix(in oklch, var(--color-accent) 75%, transparent)'
        : 'transparent',
    color: state.isSelected
      ? 'var(--color-primary-foreground)'
      : 'var(--color-foreground)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor:
        'color-mix(in oklch, var(--color-accent) 75%, transparent)',
    },
    borderRadius: '4px',
  }),

  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-input)',
    borderRadius: 'calc(var(--radius) - 2px)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  }),

  singleValue: (provided) => ({
    ...provided,
    color: 'var(--color-foreground)',
  }),

  placeholder: (provided) => ({
    ...provided,
    color: 'rgb(156 163 175)',
  }),

  multiValue: (provided) => ({
    ...provided,
    backgroundColor:
      'color-mix(in oklch, var(--color-accent) 60%, transparent)',
    borderRadius: 'calc(var(--radius) - 4px)',
  }),

  multiValueLabel: (provided) => ({
    ...provided,
    color: 'var(--color-accent-foreground)',
  }),

  multiValueRemove: (provided) => ({
    ...provided,
    color: 'var(--color-accent-foreground)',
    '&:hover': {
      backgroundColor:
        'color-mix(in oklch, var(--color-destructive) 80%, transparent)',
      color: 'var(--color-destructive-foreground)',
    },
  }),

  dropdownIndicator: (provided) => ({
    ...provided,
    padding: 6,
  }),

  menuList: (provided) => ({
    ...provided,
    padding: '4px',
  }),
}

export const classNamesSelect = {
  container: () => 'border-input',
  control: () => 'border-input text-nowrap shadow-xs',
  input: () => 'text-sm text-nowrap',
  option: () => '!text-sm text-nowrap',
  valueContainer: () => 'text-sm text-nowrap',
}

export const themeSelect: ThemeConfig = (theme: Theme) => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary: 'var(--color-primary)',
    primary75: 'color-mix(in oklch, var(--color-primary) 75%, transparent)',
    primary50: 'color-mix(in oklch, var(--color-primary) 50%, transparent)',
    primary25: 'color-mix(in oklch, var(--color-primary) 25%, transparent)',
    danger: 'var(--color-destructive)',
    dangerLight:
      'color-mix(in oklch, var(--color-destructive) 50%, transparent)',
  },
})

export const componentsSelect = {
  DropdownIndicator,
  ClearIndicator,
}
