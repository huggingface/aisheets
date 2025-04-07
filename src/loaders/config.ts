import { routeLoader$ } from '@builder.io/qwik-city';
import * as config from '~/config';

export const userServerConfig = routeLoader$(async ({ request }) => {
  return {
    GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID!,
    GOOGLE_REDIRECT_URI: config.GOOGLE_REDIRECT_URI!,
    // TODO: add more env variables here
    // like huggingface token, etc.
  };
});
