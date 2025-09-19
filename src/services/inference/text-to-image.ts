import { type InferenceProvider, textToImage } from '@huggingface/inference';
import { appConfig } from '~/config';
import { cacheGet, cacheSet } from '../cache';
import { renderInstruction } from './materialize-prompt';
import {
  handleError,
  normalizeOptions,
  type PromptExecutionParams,
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
  modelProvider?: string;
  endpointUrl?: string;
  accessToken?: string;
}) => {
  const {
    authentication: { hfToken },
  } = appConfig;

  const args: any = {
    inputs,
    accessToken: hfToken ?? accessToken,
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

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
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
