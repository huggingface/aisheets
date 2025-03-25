import {
  isBrowser,
  isServer,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import type { RequestEvent, RequestEventBase } from '@builder.io/qwik-city';

export interface ServerSession {
  token: string;
  username: string;
}

export interface ClientSession {
  token: string;
  expires: Date;
  user: {
    name: string;
    username: string;
    picture: string;
  };
}

export const useClientSession = () => {
  const currentSession = useSignal<ClientSession>();
  if (isServer) {
    console.log('useServerSession if you want to access from server side.');
  }

  useVisibleTask$(() => {
    const oauthResult = JSON.parse(localStorage.getItem('oauth') ?? '');

    if (oauthResult) {
      currentSession.value = oauthResult;
    }
  });

  return currentSession;
};

export const useServerSession = (request: RequestEventBase): ServerSession => {
  if (isBrowser)
    throw new Error('useClientSession if you want to access from server side.');

  console.log('request', request);

  const session = request.sharedMap.get('session')!;

  if (!session) {
    throw (request as RequestEvent).redirect(302, '/');
  }

  return {
    token: session.token,
    username: session.username,
  };
};
