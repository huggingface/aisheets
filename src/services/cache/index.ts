import NodeCache from 'node-cache';

const serverCache = new NodeCache({
  stdTTL: 60 * 15, // Default TTL of 15 minutes
  checkperiod: 60 * 5, // Check every 5 minutes
  useClones: false, // Disable cloning for performance
  maxKeys: 10000 * 5, // Limit the number of keys
  deleteOnExpire: true, // Delete keys on expiration
});

export const cacheGet = (key: string): any | undefined => {
  return serverCache.get(key);
};

export const cacheSet = (key: string, value: any): any => {
  serverCache.set(key, value);

  return value;
};
