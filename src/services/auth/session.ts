import { isDev } from '@builder.io/qwik';
import type { CookieOptions, RequestEvent } from '@builder.io/qwik-city';
import type { Session } from '~/state';

export const saveSession = async (event: RequestEvent, session: Session) => {
  const { cookie, sharedMap } = event;
  const options: CookieOptions = {
    sameSite: 'none',
    secure: true,
    httpOnly: !isDev,
    path: '/',
  };

  try {
    const decodedToken = JSON.parse(
      Buffer.from(session.token.split('.')[1], 'base64').toString(),
    );

    options.maxAge = decodedToken.exp - decodedToken.iat;
  } catch (e) {
    console.error(e);
  }

  cookie.delete('session');
  cookie.set('session', session, options);
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
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  sharedMap.set('anonymous', session);
};
