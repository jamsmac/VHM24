/**
 * IndexedDB wrapper for offline data storage
 * Stores pending tasks, photos, and cached data
 */

const DB_NAME = 'vendhub-offline'
const DB_VERSION = 1

// Store names
export const STORES = {
  PENDING_TASKS: 'pending_tasks',
  PENDING_PHOTOS: 'pending_photos',
  CACHED_TASKS: 'cached_tasks',
  CACHED_MACHINES: 'cached_machines',
  SYNC_QUEUE: 'sync_queue',
} as const

export interface PendingTask {
  id: string
  data: any
  created_at: number
  retries: number
  last_error?: string
}

export interface PendingPhoto {
  id: string
  file: File
  entity_type: string
  entity_id: string
  category_code: string
  created_at: number
  retries: number
  last_error?: string
}

export interface SyncQueueItem {
  id: string
  type: 'task' | 'photo' | 'update'
  action: 'create' | 'update' | 'delete'
  data: any
  created_at: number
  retries: number
  last_error?: string
}

class VendHubDB {
  private db: IDBDatabase | null = null

  /**
   * Initialize database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[DB] Database opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Pending tasks store
        if (!db.objectStoreNames.contains(STORES.PENDING_TASKS)) {
          const tasksStore = db.createObjectStore(STORES.PENDING_TASKS, { keyPath: 'id' })
          tasksStore.createIndex('created_at', 'created_at', { unique: false })
        }

        // Pending photos store
        if (!db.objectStoreNames.contains(STORES.PENDING_PHOTOS)) {
          const photosStore = db.createObjectStore(STORES.PENDING_PHOTOS, { keyPath: 'id' })
          photosStore.createIndex('entity_id', 'entity_id', { unique: false })
          photosStore.createIndex('created_at', 'created_at', { unique: false })
        }

        // Cached tasks store
        if (!db.objectStoreNames.contains(STORES.CACHED_TASKS)) {
          const cachedTasksStore = db.createObjectStore(STORES.CACHED_TASKS, { keyPath: 'id' })
          cachedTasksStore.createIndex('status', 'status', { unique: false })
          cachedTasksStore.createIndex('updated_at', 'updated_at', { unique: false })
        }

        // Cached machines store
        if (!db.objectStoreNames.contains(STORES.CACHED_MACHINES)) {
          const cachedMachinesStore = db.createObjectStore(STORES.CACHED_MACHINES, { keyPath: 'id' })
          cachedMachinesStore.createIndex('machine_number', 'machine_number', { unique: false })
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
          syncStore.createIndex('type', 'type', { unique: false })
          syncStore.createIndex('created_at', 'created_at', { unique: false })
        }

        console.log('[DB] Database upgraded to version', DB_VERSION)
      }
    })
  }

  /**
   * Get database instance
   */
  private getDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.')
    }
    return this.db
  }

  /**
   * Add item to store
   */
  async add<T>(storeName: string, item: T): Promise<void> {
    const db = this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(item)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to add item to ${storeName}`))
    })
  }

  /**
   * Update item in store
   */
  async put<T>(storeName: string, item: T): Promise<void> {
    const db = this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(item)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to update item in ${storeName}`))
    })
  }

  /**
   * Get item by key
   */
  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to get item from ${storeName}`))
    })
  }

  /**
   * Get all items from store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to get all items from ${storeName}`))
    })
  }

  /**
   * Delete item by key
   */
  async delete(storeName: string, key: string): Promise<void> {
    const db = this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to delete item from ${storeName}`))
    })
  }

  /**
   * Clear all items from store
   */
  async clear(storeName: string): Promise<void> {
    const db = this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to clear ${storeName}`))
    })
  }

  /**
   * Count items in store
   */
  async count(storeName: string): Promise<number> {
    const db = this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to count items in ${storeName}`))
    })
  }

  /**
   * Get items by index
   */
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to get items from ${storeName} by index ${indexName}`))
    })
  }

  /**
   * Add pending task
   */
  async addPendingTask(task: Omit<PendingTask, 'id' | 'created_at' | 'retries'>): Promise<string> {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const pendingTask: PendingTask = {
      id,
      data: task.data,
      created_at: Date.now(),
      retries: 0,
    }
    await this.add(STORES.PENDING_TASKS, pendingTask)
    return id
  }

  /**
   * Add pending photo
   */
  async addPendingPhoto(photo: Omit<PendingPhoto, 'id' | 'created_at' | 'retries'>): Promise<string> {
    const id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const pendingPhoto: PendingPhoto = {
      id,
      file: photo.file,
      entity_type: photo.entity_type,
      entity_id: photo.entity_id,
      category_code: photo.category_code,
      created_at: Date.now(),
      retries: 0,
    }
    await this.add(STORES.PENDING_PHOTOS, pendingPhoto)
    return id
  }

  /**
   * Get all pending tasks
   */
  async getPendingTasks(): Promise<PendingTask[]> {
    return this.getAll<PendingTask>(STORES.PENDING_TASKS)
  }

  /**
   * Get all pending photos
   */
  async getPendingPhotos(): Promise<PendingPhoto[]> {
    return this.getAll<PendingPhoto>(STORES.PENDING_PHOTOS)
  }

  /**
   * Remove pending task
   */
  async removePendingTask(id: string): Promise<void> {
    await this.delete(STORES.PENDING_TASKS, id)
  }

  /**
   * Remove pending photo
   */
  async removePendingPhoto(id: string): Promise<void> {
    await this.delete(STORES.PENDING_PHOTOS, id)
  }

  /**
   * Cache task for offline access
   */
  async cacheTask(task: any): Promise<void> {
    await this.put(STORES.CACHED_TASKS, { ...task, updated_at: Date.now() })
  }

  /**
   * Cache machine for offline access
   */
  async cacheMachine(machine: any): Promise<void> {
    await this.put(STORES.CACHED_MACHINES, { ...machine, updated_at: Date.now() })
  }

  /**
   * Get cached tasks
   */
  async getCachedTasks(): Promise<any[]> {
    return this.getAll(STORES.CACHED_TASKS)
  }

  /**
   * Get cached machine by QR code (machine_number)
   */
  async getMachineByQR(machineNumber: string): Promise<any | undefined> {
    const machines = await this.getByIndex(STORES.CACHED_MACHINES, 'machine_number', machineNumber)
    return machines[0]
  }

  /**
   * Add to sync queue
   */
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retries'>): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const syncItem: SyncQueueItem = {
      id,
      type: item.type,
      action: item.action,
      data: item.data,
      created_at: Date.now(),
      retries: 0,
    }
    await this.add(STORES.SYNC_QUEUE, syncItem)
    return id
  }

  /**
   * Get sync queue
   */
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.getAll<SyncQueueItem>(STORES.SYNC_QUEUE)
  }

  /**
   * Remove from sync queue
   */
  async removeFromSyncQueue(id: string): Promise<void> {
    await this.delete(STORES.SYNC_QUEUE, id)
  }

  /**
   * Get pending sync count
   */
  async getPendingSyncCount(): Promise<number> {
    const tasks = await this.count(STORES.PENDING_TASKS)
    const photos = await this.count(STORES.PENDING_PHOTOS)
    const queue = await this.count(STORES.SYNC_QUEUE)
    return tasks + photos + queue
  }

  /**
   * Close database
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('[DB] Database closed')
    }
  }
}

// Singleton instance
let dbInstance: VendHubDB | null = null

/**
 * Get database instance
 */
export async function getDB(): Promise<VendHubDB> {
  if (!dbInstance) {
    dbInstance = new VendHubDB()
    await dbInstance.init()
  }
  return dbInstance
}

/**
 * Close database
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export default VendHubDB
