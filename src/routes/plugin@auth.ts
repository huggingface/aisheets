import type { RequestEvent } from '@builder.io/qwik-city';

export const onRequest = ({ headers, sharedMap }: RequestEvent) => {
  const authorization = headers.get('Authorization');

  console.log('Authorization:', authorization);
  if (authorization) {
    sharedMap.set('session', authorization);
  }
};
