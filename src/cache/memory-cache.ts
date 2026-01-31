
interface CacheItem<T> {
    data: T;
    expires: number;
}

export class MemoryCache {
    private cache: Map<string, CacheItem<any>>;
    private ttl: number;

    constructor(ttlSeconds: number = 300) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
    }

    set<T>(key: string, value: T): void {
        this.cache.set(key, {
            data: value,
            expires: Date.now() + this.ttl
        });
    }

    get<T>(key: string): T | undefined {
        const item = this.cache.get(key);
        if (!item) return undefined;

        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return undefined;
        }

        return item.data as T;
    }

    clear(): void {
        this.cache.clear();
    }
}
