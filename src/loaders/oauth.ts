import { routeLoader$ } from '@builder.io/qwik-city';
import { CLIENT_ID, OAUTH_SCOPES } from '~/config';

export const useClientOAuth = routeLoader$(() => {
  return {
    scopes: OAUTH_SCOPES,
    clientId: CLIENT_ID,
  };
});
