import type { RequestEvent } from '@builder.io/qwik-city';
import { saveAnonymousSession } from '~/services/auth/session';

export const onRequest = async (event: RequestEvent) => {
  const { sharedMap, cookie } = event;

  const session = cookie.get('session');
  const anonymous = cookie.get('anonymous');

  if (session) {
    sharedMap.set('session', session.json());

    return;
  }

  if (anonymous) {
    sharedMap.set('anonymous', anonymous.json());

    return;
  }

  await saveAnonymousSession(event);
};
