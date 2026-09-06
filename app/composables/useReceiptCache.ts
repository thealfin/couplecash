import { openDB } from 'idb'

export interface CachedReceipt {
  id: string
  fileName: string
  fileType: string
  base64: string
  blobUrl?: string
  createdAt: number
  r2ObjectKey: string | null
  r2Status: 'idle' | 'uploading' | 'completed' | 'failed'
  aiStatus: 'idle' | 'analyzing' | 'completed' | 'failed'
  aiData: {
    amount?: number
    merchant?: string
    suggested_category?: string
    date?: string
    time?: string
    confidence?: number
    [key: string]: any
  } | null
  error?: string
}

const DB_NAME = 'couplecash-receipts-db'
const DB_VERSION = 1
const STORE_NAME = 'receipts'

// In-memory fallback for SSR or environments without IDB
const memoryCache = new Map<string, CachedReceipt>()

async function getDB() {
  if (!import.meta.client) return null
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

export function useReceiptCache() {
  async function saveReceiptToCache(
    base64: string,
    fileType = 'image/jpeg',
    fileName = `receipt_${Date.now()}.jpg`
  ): Promise<CachedReceipt> {
    const id = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const record: CachedReceipt = {
      id,
      fileName,
      fileType,
      base64,
      createdAt: Date.now(),
      r2ObjectKey: null,
      r2Status: 'idle',
      aiStatus: 'idle',
      aiData: null,
    }

    memoryCache.set(id, record)

    try {
      const db = await getDB()
      if (db) {
        await db.put(STORE_NAME, record)
      }
    } catch (err) {
      console.warn('[useReceiptCache] Failed to save in IDB, used memory fallback:', err)
    }

    return record
  }

  async function getReceiptFromCache(id: string): Promise<CachedReceipt | null> {
    if (memoryCache.has(id)) {
      return memoryCache.get(id) || null
    }

    try {
      const db = await getDB()
      if (db) {
        const record = await db.get(STORE_NAME, id)
        if (record) {
          memoryCache.set(id, record)
          return record
        }
      }
    } catch (err) {
      console.warn('[useReceiptCache] Failed to read from IDB:', err)
    }

    return null
  }

  async function updateReceiptInCache(id: string, updates: Partial<CachedReceipt>): Promise<void> {
    const existing = await getReceiptFromCache(id)
    if (!existing) return

    const updated = { ...existing, ...updates }
    memoryCache.set(id, updated)

    try {
      const db = await getDB()
      if (db) {
        await db.put(STORE_NAME, updated)
      }
    } catch (err) {
      console.warn('[useReceiptCache] Failed to update in IDB:', err)
    }
  }

  return {
    saveReceiptToCache,
    getReceiptFromCache,
    updateReceiptInCache,
  }
}
