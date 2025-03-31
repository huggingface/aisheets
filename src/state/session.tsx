import {
  $,
  type Signal,
  Slot,
  component$,
  createContextId,
  isBrowser,
  useComputed$,
  useContext,
  useContextProvider,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
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

const SESSION_KEY = 'session';

const sessionContext = createContextId<Signal<ClientSession>>(
  `${SESSION_KEY}.context`,
);

const setCookie = (session: ClientSession) => {
  document.cookie = `${SESSION_KEY}=${JSON.stringify({
    token: session.token,
    username: session.user.username,
  })}; path=/; SameSite=None; Secure`;
};

export const SessionProvider = component$(() => {
  const session = useSignal<ClientSession>();
  useContextProvider(sessionContext, session);

  useVisibleTask$(() => {
    session.value = JSON.parse(localStorage.getItem(SESSION_KEY)!);

    const syncCookie = () => {
      if (session.value) {
        setCookie(session.value);
      }
    };

    window.addEventListener('beforeunload', syncCookie);

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      syncCookie();

      const response = await originalFetch(...args);

      return response;
    };
  });

  return <Slot />;
});

export const useClientSession = () => {
  const session = useContext(sessionContext);
  const isLoggedIn = useComputed$(() => !!session.value);

  const save = $((currentSession: ClientSession) => {
    session.value = currentSession;

    localStorage.setItem(SESSION_KEY, JSON.stringify(session.value));

    setCookie(session.value);
  });

  return {
    isLoggedIn,
    session,
    save,
  };
};

export const useServerSession = (request: RequestEventBase): ServerSession => {
  if (isBrowser)
    throw new Error('useClientSession if you want to access from server side.');

  const session = request.cookie.get(SESSION_KEY);

  return session?.json<ServerSession>() as ServerSession;
};
