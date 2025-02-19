/**
 * The OAuth client ID used for authentication.
 * This value is retrieved from the environment variable `OAUTH_CLIENT_ID`.
 */
export const CLIENT_ID: string | undefined = process.env.OAUTH_CLIENT_ID;

/**
 * The Hugging Face token used for authentication.
 * This value is retrieved from the environment variable `HF_TOKEN`.
 */
export const HF_TOKEN: string | undefined = process.env.HF_TOKEN;

/**
 * The OAuth scopes used for authentication.
 * This value is retrieved from the environment variable `OAUTH_SCOPES`.
 */
export const OAUTH_SCOPES: string | undefined = process.env.OAUTH_SCOPES;

/**
 * The directory where data is stored.
 * This value is retrieved from the environment variable `DATA_DIR`, or defaults to './data' if not set.
 */
export const DATA_DIR: string = process.env.DATA_DIR || './data';

/**
 * The provider used for inference.
 * This value is retrieved from the environment variable `INFERENCE_PROVIDER`, or defaults to 'hf-inference' if not set.
 */
export const INFERENCE_PROVIDER: string =
  process.env.INFERENCE_PROVIDER || 'hf-inference';
