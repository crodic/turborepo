/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_CLIENT_URL?: string
  readonly VITE_ENABLE_RUNTIME_THEME?: string
}
