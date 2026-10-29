import { IDB_NAME, IDB_STORE } from '../../utils/constants'

/**
 * Small IndexedDB key-value store.
 * Used only for: the persisted FileSystemFileHandle (Mode A) and an optional
 * cached copy of an *encrypted* workbook for the upload fallback.
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) request.result.createObjectStore(IDB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode)
      const request = fn(tx.objectStore(IDB_STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
    })
  } finally {
    db.close()
  }
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return await withStore<T | undefined>('readonly', (store) => store.get(key) as IDBRequest<T | undefined>)
  } catch {
    return undefined
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(value, key))
  } catch {
    /* best effort */
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(key))
  } catch {
    /* best effort */
  }
}

export const IDB_KEYS = {
  sourceHandle: 'source-handle',
  uploadCache: 'upload-cache',
} as const
