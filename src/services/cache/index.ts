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
