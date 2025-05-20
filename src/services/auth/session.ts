import { isDev } from '@builder.io/qwik';
import type { RequestEvent } from '@builder.io/qwik-city';
import type { Session } from '~/state';

export const saveSession = async (event: RequestEvent, session: Session) => {
  const { cookie, sharedMap } = event;
  let maxAge = undefined;

  try {
    const decodedToken = JSON.parse(
      Buffer.from(session.token.split('.')[1], 'base64').toString(),
    );

    maxAge = decodedToken.exp - decodedToken.iat;
  } catch (e) {
    console.error(e);
  }

  cookie.delete('anonymous');
  cookie.delete('session');

  cookie.set('session', session, {
    sameSite: 'none',
    secure: true,
    httpOnly: !isDev,
    maxAge,
    path: '/',
  });
  sharedMap.set('session', session);
};

export const saveAnonymousSession = async (event: RequestEvent) => {
  const { cookie, sharedMap } = event;
  const random = crypto.randomUUID();
  const session = {
    anonymous: true,
    user: {
      username: random,
    },
  };

  cookie.delete('anonymous');
  cookie.set('anonymous', session, {
    sameSite: 'none',
    secure: true,
    httpOnly: !isDev,
    path: '/',
  });
  sharedMap.set('anonymous', session);
};
