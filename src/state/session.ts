import { isBrowser } from '@builder.io/qwik';
import type { RequestEventBase } from '@builder.io/qwik-city';

interface Session {
  token: string;
  user: {
    name: string;
    picture: string;
  };
}

export const useServerSession = ({ sharedMap }: RequestEventBase): Session => {
  if (isBrowser)
    throw new Error('useServerSession must be used on the server.');

  const session = sharedMap.get('session')!;

  if (!session) {
    throw new Error('session is undefined');
  }

  return session;
};
