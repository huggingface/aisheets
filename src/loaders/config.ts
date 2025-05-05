import { type RequestEventLoader, routeLoader$ } from '@builder.io/qwik-city';
import * as config from '~/config';
import { useServerSession } from '~/state';

/**
 * All config variables that are needed on the client side.
 * This is used to pass the config variables to the client.
 */
export const useClientConfig = routeLoader$(async function (
  this: RequestEventLoader,
) {
  useServerSession(this);

  return {
    DEFAULT_MODEL: config.DEFAULT_MODEL,
    DEFAULT_MODEL_PROVIDER: config.DEFAULT_MODEL_PROVIDER,
  };
});

/**
 * All config variables that are needed on the server side.
 *
 */
export const useServerConfig = routeLoader$(async function (
  this: RequestEventLoader,
) {
  useServerSession(this);

  return {
    CLIENT_ID: config.CLIENT_ID,
    HF_TOKEN: config.HF_TOKEN,

    GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID!,
    GOOGLE_REDIRECT_URI: config.GOOGLE_REDIRECT_URI!,
    OAUTH_SCOPES: config.OAUTH_SCOPES,
    DATA_DIR: config.DATA_DIR,
    INFERENCE_TIMEOUT: config.INFERENCE_TIMEOUT,
    NUM_CONCURRENT_REQUESTS: config.NUM_CONCURRENT_REQUESTS,
    SERPER_API_KEY: config.SERPER_API_KEY,
  };
});
