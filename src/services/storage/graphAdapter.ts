import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser'
import { SyncFailure, type SourceSnapshot, type StorageAdapter } from '../../types/sync'

const GRAPH = 'https://graph.microsoft.com/v1.0'
const SCOPES = ['Files.ReadWrite', 'User.Read']
const MAX_SIMPLE_UPLOAD = 4 * 1024 * 1024

export interface GraphSourceConfig {
  /**
   * One of:
   *  - a OneDrive path, e.g. `Documents/keynest-vault.xlsx`
   *  - a sharing link, e.g. `https://contoso-my.sharepoint.com/:x:/g/...`
   *  - a Graph item path, e.g. `/drives/{driveId}/items/{itemId}` or `/sites/{siteId}/drive/items/{itemId}`
   */
  path: string
}

export function isCloudConfigured(): boolean {
  return Boolean((import.meta.env.VITE_MS_CLIENT_ID ?? '').trim())
}

let msalInstance: PublicClientApplication | null = null
let msalReady: Promise<PublicClientApplication> | null = null

function getMsal(): Promise<PublicClientApplication> {
  if (msalReady) return msalReady
  const clientId = (import.meta.env.VITE_MS_CLIENT_ID ?? '').trim()
  if (!clientId) {
    return Promise.reject(new SyncFailure('auth-expired', 'Microsoft sign-in is not configured. Set VITE_MS_CLIENT_ID to enable Cloud Excel Mode.'))
  }
  const authority = (import.meta.env.VITE_MS_AUTHORITY ?? '').trim() || 'https://login.microsoftonline.com/common'
  msalReady = (async () => {
    const instance = new PublicClientApplication({
      auth: { clientId, authority, redirectUri: window.location.origin },
      cache: { cacheLocation: 'sessionStorage' },
    })
    await instance.initialize()
    await instance.handleRedirectPromise().catch(() => null)
    msalInstance = instance
    return instance
  })()
  return msalReady
}

function base64Url(input: string): string {
  return btoa(unescape(encodeURIComponent(input))).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-')
}

/** Builds the Graph URL that addresses the configured item (without trailing `/content`). */
export function resolveItemUrl(path: string): string {
  const trimmed = path.trim()
  if (/^https?:\/\//i.test(trimmed)) return `${GRAPH}/shares/u!${base64Url(trimmed)}/driveItem`
  if (/^\/(drives|sites|me|users|groups)\//i.test(trimmed)) return `${GRAPH}${trimmed}`
  const clean = trimmed.replace(/^\/+/, '')
  const encoded = clean.split('/').map(encodeURIComponent).join('/')
  return `${GRAPH}/me/drive/root:/${encoded}`
}

/** Adds `/content` to an item URL respecting the path-addressing colon syntax. */
function contentUrl(itemUrl: string): string {
  return itemUrl.includes('/root:/') ? `${itemUrl}:/content` : `${itemUrl}/content`
}

interface DriveItem {
  id: string
  name: string
  eTag: string
  size: number
  lastModifiedDateTime: string
  parentReference?: { driveId?: string }
  '@microsoft.graph.downloadUrl'?: string
}

export class GraphAdapter implements StorageAdapter {
  readonly mode = 'cloud-graph' as const
  readonly canWrite = true
  private config: GraphSourceConfig
  private displayName: string
  private item: DriveItem | null = null

  constructor(config: GraphSourceConfig, displayName?: string) {
    this.config = config
    this.displayName = displayName ?? config.path.split('/').filter(Boolean).pop() ?? 'OneDrive workbook'
  }

  get name(): string {
    return this.item?.name ?? this.displayName
  }

  async account(): Promise<AccountInfo | null> {
    const msal = await getMsal()
    return msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null
  }

  async checkPermission(): Promise<PermissionState> {
    try {
      const account = await this.account()
      if (!account) return 'prompt'
      const msal = await getMsal()
      await msal.acquireTokenSilent({ scopes: SCOPES, account })
      return 'granted'
    } catch (error) {
      if (error instanceof SyncFailure) throw error
      return 'prompt'
    }
  }

  /** Must be called from a user gesture (opens the Microsoft sign-in popup). */
  async requestPermission(): Promise<PermissionState> {
    const msal = await getMsal()
    try {
      const result = await msal.loginPopup({ scopes: SCOPES, prompt: 'select_account' })
      if (result.account) msal.setActiveAccount(result.account)
      return 'granted'
    } catch {
      return 'denied'
    }
  }

  private async token(): Promise<string> {
    const msal = await getMsal()
    const account = await this.account()
    if (!account) throw new SyncFailure('auth-expired', 'Sign in to Microsoft to access the cloud workbook.')
    try {
      const result = await msal.acquireTokenSilent({ scopes: SCOPES, account })
      return result.accessToken
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        throw new SyncFailure('auth-expired', 'Your Microsoft session has expired. Reconnect to continue syncing.')
      }
      if (!navigator.onLine) throw new SyncFailure('network', 'You appear to be offline.')
      throw new SyncFailure('auth-expired', 'Could not obtain a Microsoft access token. Reconnect to continue.')
    }
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.token()
    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
      })
    } catch {
      throw new SyncFailure('network', navigator.onLine ? 'Microsoft Graph could not be reached.' : 'You appear to be offline.')
    }
    if (response.ok) return response
    if (response.status === 401) throw new SyncFailure('auth-expired', 'Your Microsoft session is no longer valid. Reconnect to continue.')
    if (response.status === 403) throw new SyncFailure('permission-denied', 'Your Microsoft account does not have permission to access this file.')
    if (response.status === 404) throw new SyncFailure('file-not-found', `The cloud workbook "${this.displayName}" was not found. Check the path or sharing link.`)
    if (response.status === 412) throw new SyncFailure('conflict', 'The cloud workbook changed since it was last read.')
    if (response.status === 423) throw new SyncFailure('write-failed', 'The cloud workbook is locked, probably because it is open in Excel Online.')
    throw new SyncFailure('unknown', `Microsoft Graph returned HTTP ${response.status}.`)
  }

  private async fetchItem(): Promise<DriveItem> {
    const url = `${resolveItemUrl(this.config.path)}?select=id,name,eTag,size,lastModifiedDateTime,parentReference,@microsoft.graph.downloadUrl`
    const response = await this.request(url)
    const item = (await response.json()) as DriveItem
    this.item = item
    return item
  }

  async read(): Promise<SourceSnapshot> {
    const item = await this.fetchItem()
    const downloadUrl = item['@microsoft.graph.downloadUrl']
    let bytes: ArrayBuffer
    try {
      // Download URLs are pre-authenticated and short-lived; they must be fetched without the bearer token.
      const response = downloadUrl ? await fetch(downloadUrl) : await this.request(contentUrl(resolveItemUrl(this.config.path)))
      if (!response.ok) throw new Error(String(response.status))
      bytes = await response.arrayBuffer()
    } catch {
      throw new SyncFailure('network', 'The cloud workbook could not be downloaded.')
    }
    return { bytes, fingerprint: item.eTag }
  }

  async peekFingerprint(): Promise<string | null> {
    const item = await this.fetchItem()
    return item.eTag
  }

  async write(bytes: ArrayBuffer): Promise<string> {
    if (bytes.byteLength > MAX_SIMPLE_UPLOAD) {
      throw new SyncFailure('write-failed', 'The workbook exceeds the 4 MB simple-upload limit for Microsoft Graph.')
    }
    const item = this.item ?? (await this.fetchItem())
    const driveId = item.parentReference?.driveId
    const target = driveId ? `${GRAPH}/drives/${driveId}/items/${item.id}/content` : contentUrl(resolveItemUrl(this.config.path))
    const response = await this.request(target, {
      method: 'PUT',
      body: bytes,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'If-Match': item.eTag,
      },
    })
    const updated = (await response.json()) as DriveItem
    this.item = { ...item, ...updated }
    return updated.eTag
  }

  async signOut(): Promise<void> {
    if (!msalInstance) return
    try {
      await msalInstance.clearCache()
    } catch {
      /* ignore */
    }
  }
}
