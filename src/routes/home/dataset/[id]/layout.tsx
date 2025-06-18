import type { RequestHandler } from '@builder.io/qwik-city';

// Disable caching for /dataset/[id]
export const onGet: RequestHandler = async ({ cacheControl }) => {
  cacheControl({
    maxAge: 0,
    sMaxAge: 0,
    staleWhileRevalidate: 0,
  });
};
