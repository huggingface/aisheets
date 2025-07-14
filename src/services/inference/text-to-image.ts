import { type InferenceProvider, textToImage } from '@huggingface/inference';
import { HF_TOKEN } from '~/config';
import { cacheGet, cacheSet } from '../cache';
import { renderInstruction } from './materialize-prompt';
import {
  type PromptExecutionParams,
  handleError,
  normalizeOptions,
} from './run-prompt-execution';

const normalizeTextToImageArgs = ({
  inputs,
  modelName,
  modelProvider,
  accessToken,
  endpointUrl,
}: {
  inputs: string;
  modelName: string;
  modelProvider: string;
  accessToken?: string;
  endpointUrl?: string;
}) => {
  const args: any = {
    inputs,
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

export const textToImageGeneration = async ({
  accessToken,
  modelName,
  modelProvider,
  instruction,
  data,
  timeout,
  endpointUrl,
}: PromptExecutionParams): Promise<{
  value?: ArrayBuffer;
  done: boolean;
  error?: string;
}> => {
  const inputPrompt = renderInstruction(instruction, data);

  const cacheKey = {
    modelName,
    modelProvider,
    endpointUrl,
    instruction,
    data,
  };

  const cachedResult = await cacheGet(cacheKey);
  if (cachedResult) {
    return {
      value: cachedResult,
      done: true,
    };
  }

  try {
    const response = await textToImage(
      normalizeTextToImageArgs({
        inputs: inputPrompt,
        modelName,
        modelProvider,
        accessToken,
        endpointUrl,
      }),
      normalizeOptions(timeout),
    );

    const bytes = await response.bytes();
    cacheSet(cacheKey, bytes);

    return {
      value: bytes,
      done: true,
    };
  } catch (e) {
    return {
      error: handleError(e),
      done: true,
    };
  }
};
