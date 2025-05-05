import { join } from 'node:path';
import { isDev } from '@builder.io/qwik';

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
 * List of model IDs that should be excluded from the model list.
 * This value is retrieved from the environment variable `EXCLUDED_MODELS` as a comma-separated string.
 * If not set, defaults to a predefined list of models.
 */
export const EXCLUDED_MODELS: string[] = process.env.EXCLUDED_MODELS?.split(
  ',',
).map((m) => m.trim()) ?? [
  'HuggingFaceM4/idefics-9b-instruct',
  'meta-llama/Llama-2-70b-hf',
  'SakanaAI/TinySwallow-1.5B',
  'databricks/dbrx-instruct',
  'codellama/CodeLlama-7b-hf',
  'bigcode/starcoder2-15b',
  'deepseek-ai/deepseek-llm-67b-chat',
  'EleutherAI/gpt-neox-20b',
  'meta-llama/Llama-2-13b-chat-hf',
  'microsoft/DialoGPT-medium',
  'agentica-org/DeepScaleR-1.5B-Preview',
  'google/gemma-7b',
  'mistralai/Mixtral-8x7B-v0.1',
  'distilbert/distilgpt2',
  'mistralai/Pixtral-12B-2409',
  'google/gemma-2-9b-it',
  'bigcode/starcoder',
  'openai-community/gpt2',
  'meta-llama/Llama-2-7b-chat-hf',
  'meta-llama/Llama-3.2-1B',
];

/**
 * Default configuration for embedding operations
 */
export const default_embedding_model = {
  provider: process.env.EMBEDDING_MODEL_PROVIDER ?? 'sambanova',
  model: process.env.EMBEDDING_MODEL ?? 'intfloat/e5-mistral-7b-instruct',
  embedding_dim: Number(process.env.EMBEDDING_DIM ?? 4096),
  is_instruct: process.env.EMBEDDING_IS_INSTRUCT
    ? process.env.EMBEDDING_IS_INSTRUCT === 'true'
    : true,
} as const;

export const GOOGLE_CLIENT_ID: string | undefined =
  process.env.GOOGLE_CLIENT_ID ??
  '905039472434-7khf7dpl6002etvrn1h3ne1g0t2gv5r8.apps.googleusercontent.com';

export const GOOGLE_REDIRECT_URI: string | undefined =
  process.env.GOOGLE_REDIRECT_URI ??
  (isDev
    ? 'http://localhost:5173/oauth2/google'
    : 'https://huggingfacedg-dataground.hf.space/oauth2/google');

/**
 * If defined, the inference endpoint bill with by applied to the organization billing.
 *
 * Users must be part of the organiation in order to run inference calls. Default: undefined
 */
export const ORG_BILLING = process.env.ORG_BILLING ?? undefined;

const RUNTIME_ENV = join(DATA_DIR, process.env.NODE_ENV ?? 'development');

export const VECTOR_DB_DIR: string = join(RUNTIME_ENV, 'embeddings');
export const SQLITE_DB: string = join(RUNTIME_ENV, '.sqlite3');
export const DUCKDB_DB: string = join(RUNTIME_ENV, 'duckdb');
