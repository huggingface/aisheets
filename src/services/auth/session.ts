import { isDev } from '@builder.io/qwik';
import type { Cookie } from '@builder.io/qwik-city';

interface Session {
  token: string;
  user: {
    name: string;
    picture: string;
  };
}

export const saveSession = async (cookie: Cookie, session: Session) => {
  let expiration: Date = new Date();

  try {
    const decodedToken = JSON.parse(
      Buffer.from(session.token.split('.')[1], 'base64').toString(),
    );

    expiration = new Date(decodedToken.exp * 1000);
  } catch (e) {
    console.error(e);
  }

  cookie.delete('session');
  cookie.set('session', session, {
    secure: true,
    httpOnly: !isDev,
    expires: expiration,
    path: '/',
  });
};
