import { type RequestEventLoader, routeLoader$ } from '@builder.io/qwik-city';
import * as config from '~/config';
import { useServerSession } from '~/state';

/**
 * All config variables that are needed on the client side.
 * This is used to pass the config variables to the client.
 */
export const useClientConfig = routeLoader$(async function (
  this: RequestEventLoader,
): Promise<{
  DEFAULT_MODEL: string;
  DEFAULT_MODEL_PROVIDER: string;
  isGoogleAuthEnabled: boolean;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_REDIRECT_URI?: string;
}> {
  useServerSession(this);

  return {
    DEFAULT_MODEL: config.DEFAULT_MODEL,
    DEFAULT_MODEL_PROVIDER: config.DEFAULT_MODEL_PROVIDER,
    isGoogleAuthEnabled: Boolean(
      config.GOOGLE_CLIENT_ID && config.GOOGLE_REDIRECT_URI,
    ),
    GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI: config.GOOGLE_REDIRECT_URI,
  };
});
