import NodeCache from 'node-cache';

const FIVE_MINUTES = 60 * 5;
const ONE_HOUR = 60 * 60;
const serverCache = new NodeCache({
  stdTTL: ONE_HOUR, // Default time-to-live of 1 hour
  checkperiod: FIVE_MINUTES, // Check every 5 minutes
  maxKeys: 10000 * 5, // Limit the number of keys
  useClones: false, // Disable cloning for performance
  deleteOnExpire: true,
});

const cacheKey = (key: any): string => {
  if (typeof key === 'string') return key;

  return JSON.stringify(key, (_, v) => {
    if (typeof v === 'bigint') {
      return v.toString();
    }

    if (
      v instanceof Uint8Array ||
      v instanceof Uint16Array ||
      v instanceof Uint32Array
    ) {
      return Array.from(v).slice(0, 256).toString(); // Limit size for caching
    }

    return v;
  });
};

export const cacheGet = (key: any): any | undefined => {
  if (!key) return undefined;

  key = cacheKey(key);
  return serverCache.get(key);
};

export const cacheSet = (key: any, value: any): any => {
  if (!key || !value) {
    console.warn('Cache key or value is undefined');
    return undefined;
  }

  key = cacheKey(key);
  serverCache.set(key, value);

  return value;
};
