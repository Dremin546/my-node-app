const cacheStore = new Map();
let hits = 0;
let misses = 0;

const cache = {
  get(key) {
    const item = cacheStore.get(key);
    if (!item) {
      misses++;
      return null;
    }
    if (Date.now() > item.expiresAt) {
      cacheStore.delete(key);
      misses++;
      return null;
    }
    hits++;
    return item.value;
  },

  set(key, value, ttlSeconds = 60) {
    cacheStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  },

  clear() {
    cacheStore.clear();
  },

  getStats() {
    const totalRequests = hits + misses;
    const hitRate = totalRequests > 0 ? Number((hits / totalRequests).toFixed(2)) : 0;
    return {
      size: cacheStore.size,
      hits,
      misses,
      hitRate
    };
  }
};

module.exports = cache;
