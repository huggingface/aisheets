import { isServer, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { whoAmI } from '@huggingface/hub';

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

export const getClientSession = (): ClientSession | null => {
  if (isServer) return null;

  const data = localStorage.getItem('oauth');
  if (!data) return null;

  const session = JSON.parse(data);

  if (new Date(session.expires) < new Date()) {
    localStorage.removeItem('oauth');
    return null;
  }

  return session;
};

export const useClientSession = () => {
  const currentSession = useSignal<ClientSession>();
  const nav = useNavigate();
  if (isServer) {
    console.log('useServerSession if you want to access from server side.');
  }

  useVisibleTask$(() => {
    const session = getClientSession();
    if (session) currentSession.value = session;
    else nav('/signin');
  });

  return currentSession;
};

export const serverSession = async (
  accessToken: string,
): Promise<ServerSession> => {
  const userInfo = await whoAmI({ accessToken });

  return {
    token: accessToken,
    username: userInfo.name,
  };
};
