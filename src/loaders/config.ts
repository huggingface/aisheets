import { type RequestEventLoader, routeLoader$ } from '@builder.io/qwik-city';
import * as config from '~/config';
import { useServerSession } from '~/state';

export const useServerConfig = routeLoader$(async function (
  this: RequestEventLoader,
) {
  useServerSession(this);

  return {
    CLIENT_ID: config.CLIENT_ID,
    HF_TOKEN: config.HF_TOKEN,
    OAUTH_SCOPES: config.OAUTH_SCOPES,
    DATA_DIR: config.DATA_DIR,
    INFERENCE_TIMEOUT: config.INFERENCE_TIMEOUT,
    NUM_CONCURRENT_REQUESTS: config.NUM_CONCURRENT_REQUESTS,
    SERPER_API_KEY: config.SERPER_API_KEY,
    DEFAULT_MODEL: config.DEFAULT_MODEL,
    DEFAULT_MODEL_PROVIDER: config.DEFAULT_MODEL_PROVIDER,
  };
});
