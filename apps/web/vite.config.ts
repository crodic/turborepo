import path from 'path'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'fs'
import { defineConfig } from 'vitest/config'

function resolveAppVersion(): string {
  const rootPkgUrl = new URL('../../package.json', import.meta.url)
  const localPkgUrl = new URL('./package.json', import.meta.url)
  const targetUrl = existsSync(rootPkgUrl) ? rootPkgUrl : localPkgUrl
  try {
    const pkg = JSON.parse(readFileSync(targetUrl, 'utf8')) as {
      version?: string
    }
    return pkg.version ?? '1.0.0'
  } catch {
    return '1.0.0'
  }
}

const appVersion = resolveAppVersion()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'dist/**',
        'coverage/**',
        'node_modules/**',
        'src/main.tsx',
        'src/routes/**',
        'src/**/*.d.ts',
        'src/**/*.config.*',
        'src/**/data/**',
        'src/assets/**',
        'src/i18n/**',
        'src/test/**',
      ],
    },
  },
})
