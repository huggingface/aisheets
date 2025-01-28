import type { RequestEvent, RequestHandler } from '@builder.io/qwik-city';

export const onRequest = ({ cookie, sharedMap }: RequestEvent) => {
  const session = cookie.get('session');

  if (session) {
    sharedMap.set('session', session.json());
  }
};
