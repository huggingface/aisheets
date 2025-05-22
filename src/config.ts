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
 * Default value: 4, max. number of concurrent requests
 */
const DEFAULT_CONCURRENT_REQUESTS = 5;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 10;

export const NUM_CONCURRENT_REQUESTS = Math.min(
  Number(process.env.NUM_CONCURRENT_REQUESTS || DEFAULT_CONCURRENT_REQUESTS),
  DEFAULT_MAX_CONCURRENT_REQUESTS,
);

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
 * The URL of the model endpoint for inference operations.
 * This value is retrieved from the environment variable `MODEL_ENDPOINT_URL`.
 * If this value is defined, it will be used to send requests and the default model and provider will be ignored.
 * Otherwise, the default model and provider will be used.
 * Default value: undefined
 */
export const MODEL_ENDPOINT_URL: string | undefined =
  process.env.MODEL_ENDPOINT_URL;

/**
 * The name of the model endpoint for inference operations.
 *
 * This value is retrieved from the environment variable `MODEL_ENDPOINT_NAME`.
 *
 * Default value: 'unknown'
 */
export const MODEL_ENDPOINT_NAME: string =
  process.env.MODEL_ENDPOINT_NAME ?? 'unknown';

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
 * The model ID for the embedding model.
 *
 * This value is retrieved from the environment variable `EMBEDDING_MODEL`.
 *
 *
 * Default value: 'Xenova/all-MiniLM-L6-v2'
 */
export const EMBEDDING_MODEL_ID: string =
  process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

/**
 * The dimension of the embedding model.
 *
 * This value is retrieved from the environment variable `EMBEDDING_DIM`.
 *
 * The embedding dimension is the size of the vector representation of the input data. It must be
 * consistent with the model used for embedding.
 *
 * Default value: 384 (See default model: 'Xenova/all-MiniLM-L6-v2')
 */
export const EMBEDDING_MODEL_DIM: number = Number(
  process.env.EMBEDDING_DIM ?? 384,
);

/**
 * The provider for the embedding model.
 * This value is retrieved from the environment variable `EMBEDDING_MODEL_PROVIDER`.
 *
 * If defined, it will be used to call inference endpoints for embedding models. Othewise, the
 * transfomers library will be used to load the model from Hugging Face.
 *
 * Default value: undefined
 */
export const EMBEDDING_MODEL_PROVIDER: string | undefined =
  process.env.EMBEDDING_MODEL_PROVIDER;

/**
 * The URL for the embedding model endpoint.
 *
 * This value is retrieved from the environment variable `EMBEDDING_ENDPOINT_URL`.
 *
 * If defined, it will be used to call inference endpoints for embedding models. Othewise, the
 * transfomers library will be used to load the model from Hugging Face.
 *
 * Default value: undefined
 */
export const EMBEDDING_ENDPOINT_URL: string | undefined =
  process.env.EMBEDDING_ENDPOINT_URL;

/**
 * Default configuration for embedding operations
 */
export const DEFAULT_EMBEDDING_MODEL = {
  model: EMBEDDING_MODEL_ID,
  embeddingDim: EMBEDDING_MODEL_DIM,

  provider: EMBEDDING_MODEL_PROVIDER,
  endpointUrl: EMBEDDING_ENDPOINT_URL,

  isInstruct: process.env.EMBEDDING_IS_INSTRUCT
    ? process.env.EMBEDDING_IS_INSTRUCT === 'true'
    : true,
} as const;

/**
 *
 * This constant defines the maximum number of characters allowed in the context of the examples prompt.
 * If the examples context exceeds this limit, it will be truncated.
 *
 * This is important for performance and to avoid exceeding the token limit of the model.
 *
 * Default value: 8192
 */
const DEFAULT_EXAMPLES_PROMPT_CONTEXT_SIZE = 8192;
export const EXAMPLES_PROMPT_CONTEXT_SIZE: number =
  Number(
    process.env.EXAMPLES_PROMPT_CONTEXT_SIZE ??
      DEFAULT_EXAMPLES_PROMPT_CONTEXT_SIZE,
  ) || DEFAULT_EXAMPLES_PROMPT_CONTEXT_SIZE;

export const GOOGLE_CLIENT_ID: string | undefined =
  process.env.GOOGLE_CLIENT_ID;

export const GOOGLE_REDIRECT_URI: string | undefined =
  process.env.GOOGLE_REDIRECT_URI;

/**
 * If defined, the inference endpoint bill with by applied to the organization billing.
 *
 * Users must be part of the organiation in order to run inference calls. Default: undefined
 */
export const ORG_BILLING = process.env.ORG_BILLING ?? undefined;

/**
 * List of blocked domains or URL fragments for web search.
 * This value is retrieved from the environment variable `BLOCKED_URLS` as a comma-separated string.
 * If not set, defaults to blocking YouTube and Twitter.
 */
export const BLOCKED_URLS: string[] = process.env.BLOCKED_URLS?.split(',').map(
  (u) => u.trim(),
) ?? ['youtube.com', 'x.com', 'bloomberg.com', 'nytimes.com'];

const RUNTIME_ENV = join(DATA_DIR, process.env.NODE_ENV ?? 'development');

export const VECTOR_DB_DIR: string = join(RUNTIME_ENV, 'embeddings');
export const SQLITE_DB: string = join(RUNTIME_ENV, '.sqlite3');
export const DUCKDB_DB: string = join(RUNTIME_ENV, 'duckdb');
