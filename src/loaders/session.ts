import { routeLoader$ } from '@builder.io/qwik-city';
import { CLIENT_ID, OAUTH_SCOPES } from '~/config';
import { useServerSession } from '~/state';

export const useSession = routeLoader$((event) => {
  return useServerSession(event);
});

export const useOAuthClientEnv = routeLoader$(() => {
  return {
    scopes: OAUTH_SCOPES,
    clientId: CLIENT_ID,
  };
});
