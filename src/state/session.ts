import { isBrowser } from '@builder.io/qwik';
import type { RequestEventBase } from '@builder.io/qwik-city';

export interface Session {
  token: string;
  user: {
    name: string;
    username: string;
    picture: string;
  };
}

export const useServerSession = (
  request: RequestEventBase<QwikCityPlatform>,
): Session => {
  if (isBrowser)
    throw new Error('useServerSession must be used on the server.');

  const session = request.sharedMap.get('session')!;

  if (!session) {
    throw (request as any).redirect(302, '/');
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
