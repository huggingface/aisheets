import { type RequestEventLoader, routeLoader$ } from '@builder.io/qwik-city';
import {
  appConfig,
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_REDIRECT_URI,
} from '~/config';
import { useServerSession } from '~/state';

/**
 * All config variables that are needed on the client side.
 * This is used to pass the config variables to the client.
 */

export interface ClientConfig {
  DEFAULT_MODEL: string;
  DEFAULT_MODEL_PROVIDER: string;

  CUSTOM_MODELS?: { id: string; endpointUrl: string }[];

  isGoogleAuthEnabled: boolean;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_REDIRECT_URI?: string;

  MAX_ROWS_IMPORT: number;
}

export const useClientConfig = routeLoader$(async function (
  this: RequestEventLoader,
): Promise<ClientConfig> {
  useServerSession(this);

  const { textGeneration } = appConfig.inference.tasks;

  return {
    DEFAULT_MODEL: textGeneration.defaultModel,
    DEFAULT_MODEL_PROVIDER: textGeneration.defaultProvider,

    CUSTOM_MODELS: textGeneration.customModels,

    isGoogleAuthEnabled: Boolean(
      GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_REDIRECT_URI,
    ),
    GOOGLE_CLIENT_ID: GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_REDIRECT_URI: GOOGLE_OAUTH_REDIRECT_URI,

    MAX_ROWS_IMPORT: appConfig.data.maxRowsImport,
  };
});
