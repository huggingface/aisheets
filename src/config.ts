import { join } from 'node:path';

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
 *
 * Default value: 'openid profile inference-api manage-repos'
 */
export const OAUTH_SCOPES: string =
  process.env.OAUTH_SCOPES ?? 'openid profile inference-api manage-repos';

/**
 * The directory where data is stored.
 * This value is retrieved from the environment variable `DATA_DIR`, or defaults to './data' if not set.
 */
export const DATA_DIR: string = process.env.DATA_DIR ?? './data';

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

/**
 * The Serper API key used for web searches.
 * This value is retrieved from the environment variable `SERPER_API_KEY`.
 */
export const SERPER_API_KEY: string | undefined = process.env.SERPER_API_KEY;

/**
 * The default model provider for inference operations.
 * Default value: 'sambanova'
 */
export const DEFAULT_MODEL_PROVIDER: string =
  process.env.DEFAULT_MODEL_PROVIDER ?? 'sambanova';

/**
 * The default model for inference.
 * Default value: 'meta-llama/Llama-3.3-70B-Instruct'
 */
export const DEFAULT_MODEL: string =
  process.env.DEFAULT_MODEL ?? 'meta-llama/Llama-3.3-70B-Instruct';

/**
 * Default configuration for embedding operations
 */
export const default_embedding_model = {
  provider: process.env.EMBEDDING_MODEL_PROVIDER ?? 'sambanova',
  model: process.env.EMBEDDING_MODEL ?? 'intfloat/e5-mistral-7b-instruct',
  embedding_dim: Number(process.env.EMBEDDING_DIM ?? 4096),
} as const;

const RUNTIME_ENV = join(DATA_DIR, process.env.NODE_ENV ?? 'development');

export const VECTOR_DB_DIR: string = join(RUNTIME_ENV, 'embeddings');
export const SQLITE_DB: string = join(RUNTIME_ENV, '.sqlite3');
export const DUCKDB_DB: string = join(RUNTIME_ENV, 'duckdb');
