import { join } from 'node:path';
import { isDev } from '@builder.io/qwik';

/**
 * The Hugging Face token used for authentication.
 * This value is retrieved from the environment variable `HF_TOKEN`.
 */
const HF_TOKEN: string | undefined = process.env.HF_TOKEN;

/**
 * The OAuth client ID used for authentication.
 * This value is retrieved from the environment variable `OAUTH_CLIENT_ID`.
 */
const OAUTH_CLIENT_ID: string | undefined = process.env.OAUTH_CLIENT_ID;

/**
 * The OAuth scopes used for authentication.
 * This value is retrieved from the environment variable `OAUTH_SCOPES`.
 *
 * Default value: 'openid profile inference-api manage-repos'
 */
const OAUTH_SCOPES: string =
  process.env.OAUTH_SCOPES ?? 'openid profile inference-api manage-repos';

const OAUTH_HTTPS_ONLY: boolean =
  process.env.OAUTH_HTTPS_ONLY !== undefined
    ? process.env.OAUTH_HTTPS_ONLY === 'true' ||
      process.env.OAUTH_HTTPS_ONLY === '1'
    : !isDev;

/**
 * The directory where data is stored.
 * This value is retrieved from the environment variable `DATA_DIR`, or defaults to './data' if not set.
 */
const DATA_DIR: string = process.env.DATA_DIR ?? './data';

/**
 * The timeout duration for inference operations in milliseconds.
 *
 * This constant defines the maximum time allowed for inference operations to complete.
 * If an inference operation exceeds this duration, it will be terminated.
 *
 * Default value: 90000 (90 seconds)
 */
const INFERENCE_TIMEOUT = 90000;

/**
 * The maximum number of rows to import from a file or a Hugging Face dataset.
 *
 * This constant defines the upper limit on the number of rows that can be imported
 * to prevent performance issues and excessive resource consumption.
 *
 * Default value: 1000
 */
const MAX_ROWS_IMPORT = process.env.MAX_ROWS_IMPORT
  ? Number(process.env.MAX_ROWS_IMPORT)
  : 1000;

/**
 * The number of parallel requests to the Inference Endpoint to generate cells
 *
 * This constant defines the number of concurrent requests to be sent to the endpoint while generating cells
 *
 * Default value: 4, max. number of concurrent requests
 */
const DEFAULT_CONCURRENT_REQUESTS = 5;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 10;

const NUM_CONCURRENT_REQUESTS = Math.min(
  Number(process.env.NUM_CONCURRENT_REQUESTS || DEFAULT_CONCURRENT_REQUESTS),
  DEFAULT_MAX_CONCURRENT_REQUESTS,
);

/**
 * The default model for inference.
 * Default value: 'meta-llama/Llama-3.3-70B-Instruct'
 */
const DEFAULT_MODEL: string =
  process.env.DEFAULT_MODEL ?? 'meta-llama/Llama-3.3-70B-Instruct';

/**
 * The default model provider for inference operations.
 * Default value: 'nebius'
 */
const DEFAULT_MODEL_PROVIDER: string =
  process.env.DEFAULT_MODEL_PROVIDER ?? 'nebius';

/**
 * If defined, the inference endpoint bill with by applied to the organization billing.
 *
 * Users must be part of the organiation in order to run inference calls. Default: undefined
 */
const ORG_BILLING = process.env.ORG_BILLING ?? undefined;

/**
 * The URL of the model endpoint for inference operations.
 * This value is retrieved from the environment variable `MODEL_ENDPOINT_URL`.
 * If this value is defined, it will be used to send requests and the default model and provider will be ignored.
 * Otherwise, the default model and provider will be used.
 * Default value: undefined
 */
const MODEL_ENDPOINT_URL: string | undefined = process.env.MODEL_ENDPOINT_URL;

/**
 * The name of the model endpoint for inference operations.
 *
 * This value is retrieved from the environment variable `MODEL_ENDPOINT_NAME`.
 *
 * Default value: 'unknown'
 */
const MODEL_ENDPOINT_NAME: string =
  process.env.MODEL_ENDPOINT_NAME ?? 'unknown';

/**
 * List of model IDs that should be excluded from the model list.
 * This value is retrieved from the environment variable `EXCLUDED_MODELS` as a comma-separated string.
 * If not set, defaults to a predefined list of models.
 */
const EXCLUDED_MODELS: string[] = process.env.EXCLUDED_MODELS?.split(',').map(
  (m) => m.trim(),
) ?? [
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
const EMBEDDING_MODEL_ID: string =
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
const EMBEDDING_MODEL_DIM: number = Number(process.env.EMBEDDING_DIM ?? 384);

/**
 * The provider for the embedding model.
 * This value is retrieved from the environment variable `EMBEDDING_MODEL_PROVIDER`.
 *
 * If defined, it will be used to call inference endpoints for embedding models. Othewise, the
 * transfomers library will be used to load the model from Hugging Face.
 *
 * Default value: undefined
 */
const EMBEDDING_MODEL_PROVIDER: string | undefined =
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
const EMBEDDING_ENDPOINT_URL: string | undefined =
  process.env.EMBEDDING_ENDPOINT_URL;

/**
 * The Serper API key used for web searches.
 * This value is retrieved from the environment variable `SERPER_API_KEY`.
 */
const SERPER_API_KEY: string | undefined = process.env.SERPER_API_KEY;

/**
 * List of blocked domains or URL fragments for web search.
 * This value is retrieved from the environment variable `BLOCKED_URLS` as a comma-separated string.
 * If not set, defaults to blocking YouTube and Twitter.
 */
const BLOCKED_URLS: string[] = process.env.BLOCKED_URLS?.split(',').map((u) =>
  u.trim(),
) ?? ['youtube.com', 'x.com', 'bloomberg.com', 'nytimes.com'];

/**
 *
 * This constant defines the maximum number of characters allowed in the context of the examples prompt.
 * If the examples context exceeds this limit, it will be truncated.
 *
 * This is important for performance and to avoid exceeding the token limit of the model.
 *
 * Default value: 8192
 */
const DEFAULT_EXAMPLES_PROMPT_MAX_CONTEXT_SIZE = 8192;
export const EXAMPLES_PROMPT_MAX_CONTEXT_SIZE: number =
  Number(
    process.env.EXAMPLES_PROMPT_MAX_CONTEXT_SIZE ??
      DEFAULT_EXAMPLES_PROMPT_MAX_CONTEXT_SIZE,
  ) || DEFAULT_EXAMPLES_PROMPT_MAX_CONTEXT_SIZE;

/**
 * This constant defines the maximum number of characters allowed in the context of the sources prompt.
 * If the sources context exceeds this limit, it will be truncated.
 *
 * This is important for performance and to avoid exceeding the token limit of the model.
 * Default value: 61440 (16k tokens)
 */
const DEFAULT_SOURCES_PROMPT_MAX_CONTEXT_SIZE = 61440; // 16k tokens
export const SOURCES_PROMPT_MAX_CONTEXT_SIZE: number =
  Number(
    process.env.SOURCES_PROMPT_MAX_CONTEXT_SIZE ??
      DEFAULT_SOURCES_PROMPT_MAX_CONTEXT_SIZE,
  ) || DEFAULT_SOURCES_PROMPT_MAX_CONTEXT_SIZE;

/**
 * This constant defines whether telemetry is enabled.
 *
 * It checks the environment variable `TELEMETRY_ENABLED` and defaults to false in development mode.
 * If the variable is set to 'true' or '1', telemetry will be enabled.
 * Otherwise, it will be disabled.
 * Default value: false in development mode, true otherwise
 */
const TELEMETRY_ENABLED: boolean =
  process.env.TELEMETRY_ENABLED !== undefined
    ? process.env.TELEMETRY_ENABLED === 'true' ||
      process.env.TELEMETRY_ENABLED === '1'
    : !isDev;

export const GOOGLE_OAUTH_CLIENT_ID: string | undefined =
  process.env.GOOGLE_OAUTH_CLIENT_ID;

export const GOOGLE_OAUTH_REDIRECT_URI: string | undefined =
  process.env.GOOGLE_OAUTH_REDIRECT_URI;

const RUNTIME_ENV = join(DATA_DIR, process.env.NODE_ENV ?? 'development');

export const appConfig = {
  authentication: {
    clientId: OAUTH_CLIENT_ID,
    scopes: OAUTH_SCOPES,
    httpsOnly: OAUTH_HTTPS_ONLY,
    hfToken: HF_TOKEN,
  },

  inference: {
    timeout: INFERENCE_TIMEOUT,
    numConcurrentRequests: NUM_CONCURRENT_REQUESTS,
    billTo: ORG_BILLING,
    excludedHubModels: EXCLUDED_MODELS,

    tasks: {
      textGeneration: {
        defaultModel: DEFAULT_MODEL,
        defaultProvider: DEFAULT_MODEL_PROVIDER,

        endpointUrl: MODEL_ENDPOINT_URL,
        endpointName: MODEL_ENDPOINT_NAME,
      },

      featureExtraction: {
        model: EMBEDDING_MODEL_ID,
        embeddingDim: EMBEDDING_MODEL_DIM,
        provider: EMBEDDING_MODEL_PROVIDER,
        endpointUrl: EMBEDDING_ENDPOINT_URL,
        isInstruct: process.env.EMBEDDING_IS_INSTRUCT
          ? process.env.EMBEDDING_IS_INSTRUCT === 'true'
          : true,
      },
    },
  },

  data: {
    maxRowsImport: MAX_ROWS_IMPORT,
    dataDir: DATA_DIR,
    vectorDbDir: join(RUNTIME_ENV, 'embeddings'),
    sqliteDb: join(RUNTIME_ENV, '.sqlite3'),
    duckDb: join(RUNTIME_ENV, 'duckdb'),
  },

  webSearch: {
    serperApiKey: SERPER_API_KEY,
    blockedUrls: BLOCKED_URLS,
  },

  enableTelemetry: TELEMETRY_ENABLED,
};
