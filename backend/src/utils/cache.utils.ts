/**
 * High-Performance In-Memory TTL Cache
 * Provides low-latency caching for dynamic shortlink lookups and dashboard metrics
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleTtlCache<T = any> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private defaultTtlMs: number;
  private maxItems: number;

  constructor(defaultTtlMs = 60000, maxItems = 5000) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxItems = maxItems;

    // Periodic sweep every 2 minutes
    setInterval(() => {
      this.cleanup();
    }, 120000).unref();
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict oldest if max capacity reached
    if (this.store.size >= this.maxItems) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  del(key: string): boolean {
    return this.store.delete(key);
  }

  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// 1. Dynamic QR Lookup Cache (TTL: 60 seconds)
export const dynamicQrCache = new SimpleTtlCache<{
  id: string;
  name: string;
  type: string;
  content: string;
  destinationUrl: string | null;
  isDynamic: boolean;
  status: string;
  scanCount: number;
}>(60000, 10000);

// 2. User Overview Metrics Cache (TTL: 15 seconds)
export const metricsCache = new SimpleTtlCache<any>(15000, 2000);
