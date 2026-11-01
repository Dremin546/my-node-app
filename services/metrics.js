const cache = require('./cache');

let totalQueries = 0;
let totalTimeMs = 0;
let totalErrors = 0;

const metrics = {
  recordQuery(durationMs, isError = false) {
    totalQueries++;
    totalTimeMs += durationMs;
    if (isError) totalErrors++;
  },

  getMetrics() {
    const avgTime = totalQueries > 0 ? Number((totalTimeMs / totalQueries).toFixed(1)) : 0;
    const cacheStats = cache.getStats();
    return {
      queries: totalQueries,
      avgTime,
      errors: totalErrors,
      cacheHitRate: cacheStats.hitRate
    };
  }
};

module.exports = metrics;
