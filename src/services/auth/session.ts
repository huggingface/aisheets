import { isDev } from '@builder.io/qwik';
import type { Cookie } from '@builder.io/qwik-city';
import type { Session } from '~/state';

export const saveSession = async (cookie: Cookie, session: Session) => {
  let maxAge = undefined;

  try {
    const decodedToken = JSON.parse(
      Buffer.from(session.token.split('.')[1], 'base64').toString(),
    );

    maxAge = decodedToken.exp - decodedToken.iat;
  } catch (e) {
    console.error(e);
  }

  cookie.delete('session');
  cookie.set('session', session, {
    sameSite: 'none',
    secure: true,
    httpOnly: !isDev,
    maxAge,
    path: '/',
  });
};
