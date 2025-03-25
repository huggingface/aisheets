import { isBrowser, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { RequestEventBase } from '@builder.io/qwik-city';

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

  useVisibleTask$(() => {
    const oauthResult = JSON.parse(localStorage.getItem('oauth')!);

    if (oauthResult) {
      currentSession.value = oauthResult;
    }
  });

  return currentSession;
};

export const useServerSession = (request: RequestEventBase): ServerSession => {
  if (isBrowser)
    throw new Error('useClientSession if you want to access from server side.');

  const session = request.sharedMap.get('session');

  return session;
};
