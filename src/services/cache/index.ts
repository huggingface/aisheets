import NodeCache from 'node-cache';

const serverCache = new NodeCache({
  stdTTL: 60 * 60, // Default time-to-live of 1 hour
  checkperiod: 60 * 5, // Check every 5 minutes
  maxKeys: 10000 * 5, // Limit the number of keys
  useClones: false, // Disable cloning for performance
  deleteOnExpire: true, // Delete keys on expiration
});

const cacheKey = (key: any): string => {
  if (typeof key === 'string') {
    return key;
  }
  return JSON.stringify(key, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v,
  );
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
