import { isBrowser } from '@builder.io/qwik';
import type { RequestEventLoader } from '@builder.io/qwik-city';

export interface Session {
  token: string;
  user: {
    name: string;
    username: string;
    picture: string;
  };
}

export const useServerSession = (request: RequestEventLoader): Session => {
  if (isBrowser)
    throw new Error('useServerSession must be used on the server.');

  const session = request.sharedMap.get('session')!;

  if (!session) {
    throw request.redirect(302, '/');
  }

  return {
    token: session.token,
    user: {
      name: session.user.name,
      username: session.user.username,
      picture: session.user.picture,
    },
  };
};
