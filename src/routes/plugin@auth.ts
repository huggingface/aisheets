import type { RequestEvent } from '@builder.io/qwik-city';

export const onRequest = ({
  cookie,
  sharedMap,
  pathname,
  redirect,
}: RequestEvent) => {
  const session = cookie.get('session');

  if (!session) {
    if (pathname === '/auth/sign-in/' || pathname === '/auth/callback/') return;

    throw redirect(302, '/auth/sign-in/');
  }

  sharedMap.set('session', session.json());
};
