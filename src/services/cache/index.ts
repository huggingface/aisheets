import NodeCache from 'node-cache';

const serverCache = new NodeCache({
  stdTTL: 60 * 15, // Default TTL of 15 minutes
  checkperiod: 60 * 5, // Check every 5 minutes
  useClones: false, // Disable cloning for performance
  maxKeys: 10000 * 5, // Limit the number of keys
  deleteOnExpire: true, // Delete keys on expiration
});

export const cacheGet = (key: any): any | undefined => {
  if (!key) return undefined;

  if (typeof key !== 'string') {
    console.warn('Cache key is not a string, converting to JSON string');
    key = JSON.stringify(key);
  }

  return serverCache.get(key);
};

export const cacheSet = (key: any, value: any): any => {
  if (!key || !value) {
    console.warn('Cache key or value is undefined');
    return undefined;
  }

  if (typeof key !== 'string') {
    console.warn('Cache key is not a string, converting to JSON string');
    key = JSON.stringify(key);
  }

  serverCache.set(key, value);

  return value;
};
