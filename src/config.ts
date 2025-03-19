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
 * The timeout duration for inference operations in milliseconds.
 *
 * This constant defines the maximum time allowed for inference operations to complete.
 * If an inference operation exceeds this duration, it will be terminated.
 *
 * Default value: 90000 (90 seconds)
 */
export const INFERENCE_TIMEOUT = 90000;

/**
 * The number of parallel requests to the Inference Endpoint to generate cells
 *
 * This constant defines the number of concurrent requests to be sent to the endpoint while generating cells
 *
 * Default value: 5, max. number of concurrent requests 10
 */
export const NUM_CONCURRENT_REQUESTS = 5;
