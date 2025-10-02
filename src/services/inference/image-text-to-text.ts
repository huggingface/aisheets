import { chatCompletion, type InferenceProvider } from '@huggingface/inference';
import { appConfig } from '~/config';
import { detectMimeType } from '~/features/table/utils/mime-types';
import { cacheGet, cacheSet } from '../cache';
import { renderInstruction } from './materialize-prompt';
import {
  handleError,
  normalizeOptions,
  type PromptExecutionParams,
} from './run-prompt-execution';

const normalizeImageTextToTextArgs = ({
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
  accessToken?: string;
  endpointUrl?: string;
}) => {
  const {
    authentication: { hfToken },
  } = appConfig;

  const mimeType = detectMimeType(imageData, '');
  const dataUri = `data:${mimeType};base64,${Buffer.from(imageData).toString('base64')}`;

  const args: any = {
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: inputs,
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUri,
            },
          },
        ],
      },
    ],
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

export const imageTextToTextGeneration = async ({
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
  value?: string;
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
    imageData: Array.from(imageData), // Convert to array for caching
  };

  const cachedResult = await cacheGet(cacheKey);
  if (cachedResult) {
    return {
      value: cachedResult,
      done: true,
    };
  }

  try {
    const args = normalizeImageTextToTextArgs({
      inputs: inputPrompt,
      imageData,
      modelName,
      modelProvider,
      accessToken,
      endpointUrl,
    });

    const response = await chatCompletion(args, normalizeOptions(timeout));

    const textResponse = response.choices[0]?.message?.content || '';
    cacheSet(cacheKey, textResponse);

    return {
      value: textResponse,
      done: true,
    };
  } catch (e) {
    return {
      error: handleError(e),
      done: true,
    };
  }
};
