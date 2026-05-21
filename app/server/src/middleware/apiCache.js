/**
 * 内存缓存中间件（含 LRU 淘汰 + 定时清理）
 * 对 GET 请求按 URL（含 query）缓存响应，TTL 过期自动失效
 */

const MAX_CACHE_SIZE = 200; // 最大缓存条目数
const cache = new Map();

// 定时清理过期条目（每 5 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.time > entry.ttl) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function apiCache(ttlSeconds = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.time < cached.ttl) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // 拦截 res.json 捕获响应数据
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // LRU 淘汰：超过上限时删除最旧的条目
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      cache.set(key, { data, time: Date.now(), ttl: ttlSeconds * 1000 });
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

// 手动清除缓存（数据更新时调用）
function clearCache() {
  cache.clear();
}

module.exports = { apiCache, clearCache };
