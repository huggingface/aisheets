import type {
  RequestEvent,
  RequestEventBase,
  RequestHandler,
} from '@builder.io/qwik-city';
import { useServerSession } from '~/state/session';

export const onGet: RequestHandler = async (event: RequestEvent) => {
  const { cacheControl } = event;

  checkSession(event);

  cacheControl({
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    maxAge: 5,
  });
};

export const checkSession = (request: RequestEventBase) => {
  if (!request.url.pathname.startsWith('/home')) return;

  try {
    useServerSession(request);
  } catch (error) {
    console.error('Session not found, redirecting to login', error);
    throw (request as RequestEvent).redirect(302, '/');
  }
};
