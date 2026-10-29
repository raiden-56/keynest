/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MASTER_USERNAME?: string
  readonly VITE_MASTER_PASSWORD_HASH?: string
  readonly VITE_MS_CLIENT_ID?: string
  readonly VITE_MS_AUTHORITY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
