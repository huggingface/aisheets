import { isBrowser } from '@builder.io/qwik';
import type { RequestEventBase } from '@builder.io/qwik-city';

export interface Session {
  anonymous: boolean;
  token: string;
  user: {
    name: string;
    username: string;
    picture: string;
  };
}

export const useServerSession = ({
  sharedMap,
}: RequestEventBase<QwikCityPlatform>): Session => {
  if (isBrowser) {
    throw new Error('useServerSession must be used on the server.');
  }

  const session = sharedMap.get('session') ?? sharedMap.get('anonymous');

  if (!session) throw new Error('Session not found.');

  return session;
};
