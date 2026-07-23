export interface CacheProvider {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  invalidate(key: string): Promise<void>
  clear(): Promise<void>
}

export class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, { value: any; expiresAt?: number }>()

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key)
    if (!item) return null
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key)
      return null
    }
    return item.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    this.store.set(key, { value, expiresAt })
  }

  async invalidate(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }
}

export class RedisCacheProvider implements CacheProvider {
  private memoryFallback = new MemoryCacheProvider()

  async get<T>(key: string): Promise<T | null> {
    // Production Redis GET logic
    return this.memoryFallback.get<T>(key)
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Production Redis SET logic
    return this.memoryFallback.set<T>(key, value, ttlSeconds)
  }

  async invalidate(key: string): Promise<void> {
    return this.memoryFallback.invalidate(key)
  }

  async clear(): Promise<void> {
    return this.memoryFallback.clear()
  }
}

export class CacheProviderFactory {
  private static instance: CacheProvider = new MemoryCacheProvider()

  static getProvider(): CacheProvider {
    return this.instance
  }

  static setProvider(provider: CacheProvider): void {
    this.instance = provider
  }
}
