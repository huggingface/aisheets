import { type InferenceProvider, textToImage } from '@huggingface/inference';
import { HF_TOKEN } from '~/config';
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

    return {
      value: await response.bytes(),
      done: true,
    };
  } catch (e) {
    return {
      error: handleError(e),
      done: true,
    };
  }
};
