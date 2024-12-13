/// <reference types="vite/client" />

interface ImprotMetaEnv {
  readonly VITE_GITHUB_APP_ID: string
  readonly VITE_GITHUB_CLIENT_ID: string
  readonly VITE_GITHUB_CLIENT_SECRET: string
  readonly VITE_GITHUB_PRIVATE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
