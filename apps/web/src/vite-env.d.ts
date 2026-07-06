/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_CLIENT_URL?: string
  readonly VITE_IMPERSONATION_CALLBACK_URL?: string
  readonly VITE_ENABLE_THEME_FEATURE?: string
  readonly VITE_ENABLE_ADMIN_RUNTIME_THEME?: string
  readonly VITE_ENABLE_CLIENT_RUNTIME_THEME?: string
}
