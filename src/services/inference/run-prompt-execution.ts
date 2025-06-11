import {
  type BaseArgs,
  type FeatureExtractionArgs,
  type InferenceProvider,
  type Options,
  chatCompletion,
  chatCompletionStream,
} from '@huggingface/inference';

import type { ChatCompletionInput } from '@huggingface/tasks';

import { isDev } from '@builder.io/qwik';
import { HF_TOKEN, INFERENCE_TIMEOUT, ORG_BILLING } from '~/config';
import { type Example, materializePrompt } from './materialize-prompt';

export interface PromptExecutionParams {
  modelName: string;
  modelProvider: string;
  instruction: string;
  sourcesContext?: {
    source_uri: string;
    text: string;
  }[];
  data: Record<string, any>;
  examples?: Array<Example>;
  idx?: number;
  stream?: boolean;

  timeout?: number;
  accessToken?: string;
  endpointUrl?: string;
}

export interface PromptExecutionResponse {
  value?: string;
  error?: string;
  done?: boolean;
}

const handleError = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  return JSON.stringify(e);
};

export const runPromptExecution = async ({
  accessToken,
  modelName,
  modelProvider,
  instruction,
  sourcesContext,
  data,
  examples,
  timeout,
  endpointUrl,
}: PromptExecutionParams): Promise<PromptExecutionResponse> => {
  const inputPrompt = materializePrompt({
    instruction,
    sourcesContext,
    data,
    examples,
  });
  const args = normalizeChatCompletionArgs({
    messages: [{ role: 'user', content: inputPrompt }],
    modelProvider,
    modelName,
    accessToken,
    endpointUrl,
  });
  const options = normalizeOptions(timeout);

  if (isDev) showPromptInfo(modelName, modelProvider, inputPrompt);

  try {
    const response = await chatCompletion(args, options);
    return {
      value: response.choices[0].message.content,
      done: true,
    };
  } catch (e) {
    return {
      error: handleError(e),
      done: true,
    };
  }
};

export const runPromptExecutionStream = async function* ({
  modelName,
  modelProvider,
  instruction,
  sourcesContext,
  data,
  examples,
  timeout,
  accessToken,
  endpointUrl,
}: PromptExecutionParams): AsyncGenerator<PromptExecutionResponse> {
  const inputPrompt = materializePrompt({
    instruction,
    sourcesContext,
    data,
    examples,
  });
  const args = normalizeChatCompletionArgs({
    messages: [{ role: 'user', content: inputPrompt }],
    modelProvider,
    modelName,
    accessToken,
    endpointUrl,
  });
  const options = normalizeOptions(timeout);

  if (isDev) showPromptInfo(modelName, modelProvider, inputPrompt);

  try {
    let accumulated = '';
    const stream = chatCompletionStream(args, options);

    for await (const chunk of stream) {
      if (chunk.choices?.[0]?.delta?.content) {
        accumulated += chunk.choices[0].delta.content;
        yield { value: accumulated, done: false };
      }
    }

    yield { value: accumulated, done: true };
  } catch (e) {
    yield { error: handleError(e), done: true };
  }
};

export const normalizeFeatureExtractionArgs = ({
  inputs,
  modelName,
  modelProvider,
  accessToken,
  endpointUrl,
}: {
  inputs: string[];
  modelName: string;
  modelProvider: string;
  accessToken?: string;
  endpointUrl?: string;
}): FeatureExtractionArgs => {
  const args: FeatureExtractionArgs = {
    inputs,
    accessToken: HF_TOKEN ?? accessToken,
    // We must review the chunk strategy to avoid truncating the input
    truncate: true, // Otherwise, it will raise an error (see https://github.com/huggingface/text-embeddings-inference/issues/356)
  };

  if (endpointUrl) {
    args.endpointUrl = endpointUrl;
  } else {
    args.model = modelName;
    args.provider = modelProvider as InferenceProvider;
  }

  return args;
};

export const normalizeChatCompletionArgs = ({
  messages,
  modelName,
  modelProvider,
  accessToken,
  endpointUrl,
}: {
  messages: any[];
  modelName: string;
  modelProvider: string;
  accessToken?: string;
  endpointUrl?: string;
}): BaseArgs & ChatCompletionInput => {
  const args: BaseArgs & ChatCompletionInput = {
    messages,
    accessToken: HF_TOKEN ?? accessToken,
  };

  if (endpointUrl) {
    args.endpointUrl = endpointUrl;
  } else {
    args.model = modelName;
    args.provider = modelProvider as InferenceProvider;
  }

  return args;
};

export const normalizeOptions = (timeout?: number | undefined): Options => {
  const options: Record<string, any> = {
    signal: AbortSignal.timeout(timeout ?? INFERENCE_TIMEOUT),
  };

  if (ORG_BILLING) options.billTo = ORG_BILLING;

  return options;
};

function showPromptInfo(
  modelName: string,
  modelProvider: string,
  inputPrompt: string,
) {
  console.log('\n🔷 Prompt 🔷');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Model:', modelName);
  console.log('Provider:', modelProvider);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Prompt:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(inputPrompt);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔷 End Prompt 🔷\n');
}
