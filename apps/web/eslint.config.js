import { viteReactConfig } from '@repo/eslint-config/vite-react'
import { globalIgnores } from 'eslint/config'

export default [
  globalIgnores([
    'src/lib/ui-builder/**',
    'src/hooks/use-copy-to-clipboard.tsx',
    'src/hooks/use-keyboard-shortcuts.tsx',
    'src/hooks/use-store.ts',
  ]),
  ...viteReactConfig,
]
