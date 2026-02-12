import NodeCache from 'node-cache'

class CacheService {
    private cache: NodeCache

    constructor(ttlSeconds = 60 * 5) { // Default 5 minutes
        this.cache = new NodeCache({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false,
        })
    }

    get<T>(key: string): T | undefined {
        return this.cache.get<T>(key)
    }

    set(key: string, value: unknown, ttl?: number): boolean {
        if (ttl) {
            return this.cache.set(key, value, ttl)
        }
        return this.cache.set(key, value)
    }

    del(keys: string | string[]): number {
        return this.cache.del(keys)
    }

    delStartWith(startStr: string) {
        if (!startStr) return

        const keys = this.cache.keys()
        for (const key of keys) {
            if (key.indexOf(startStr) === 0) {
                this.del(key)
            }
        }
    }

    flush() {
        this.cache.flushAll()
    }
}

export const cache = new CacheService()
