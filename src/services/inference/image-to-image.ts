import { type InferenceProvider, imageToImage } from '@huggingface/inference';
import { appConfig } from '~/config';
import { cacheGet, cacheSet } from '../cache';
import { renderInstruction } from './materialize-prompt';
import {
  handleError,
  normalizeOptions,
  type PromptExecutionParams,
} from './run-prompt-execution';

const normalizeImageToImageArgs = ({
  inputs,
  imageData,
  modelName,
  modelProvider,
  accessToken,
  endpointUrl,
}: {
  inputs: string;
  imageData: Uint8Array;
  modelName: string;
  modelProvider?: string;
  endpointUrl?: string;
  accessToken?: string;
}) => {
  const {
    authentication: { hfToken },
  } = appConfig;

  const args: any = {
    inputs: new Blob([imageData.buffer as ArrayBuffer]),
    parameters: {
      prompt: inputs,
    },
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

export const imageToImageGeneration = async ({
  accessToken,
  modelName,
  modelProvider,
  instruction,
  data,
  imageData,
  timeout,
  endpointUrl,
}: PromptExecutionParams & {
  imageData: Uint8Array;
}): Promise<{
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
    imageData: Array.from(imageData),
  };

  const cachedResult = await cacheGet(cacheKey);
  if (cachedResult) {
    return {
      value: cachedResult,
      done: true,
    };
  }

  try {
    const args = normalizeImageToImageArgs({
      inputs: inputPrompt,
      imageData,
      modelName,
      modelProvider,
      accessToken,
      endpointUrl,
    });

    const response = await imageToImage(args, normalizeOptions(timeout));

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    cacheSet(cacheKey, bytes);

    return {
      value: buffer,
      done: true,
    };
  } catch (e) {
    return {
      error: handleError(e),
      done: true,
    };
  }
};
