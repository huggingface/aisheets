import type { RequestEvent } from '@builder.io/qwik-city';
import { useServerSession } from '~/state';

export const onRequest = (event: RequestEvent) => {
  const { pathname, redirect } = event;
  const session = useServerSession(event);

  if (!session) {
    if (pathname === '/auth/sign-in/' || pathname === '/auth/callback/') return;

    throw redirect(302, '/auth/sign-in/');
  }
};
