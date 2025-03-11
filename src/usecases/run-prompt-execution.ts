import { chatCompletion, chatCompletionStream } from '@huggingface/inference';
import { type Example, materializePrompt } from './materialize-prompt';

export interface PromptExecutionParams {
  accessToken?: string;
  modelName: string;
  modelProvider: string;
  instruction: string;
  data?: object;
  examples?: Array<Example>;
  stream?: boolean;
  timeout?: number;
  idx?: number;
}

export interface PromptExecutionResponse {
  value?: string;
  error?: string;
  done?: boolean;
}

const DEFAULT_TIMEOUT = 60000;
const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY =
  Number.parseInt(process.env.MAX_PROMPT_CONCURRENCY ?? '', 10) ||
  DEFAULT_CONCURRENCY;

type Provider =
  | 'fal-ai'
  | 'replicate'
  | 'sambanova'
  | 'together'
  | 'hf-inference';

const createApiParams = (
  modelName: string,
  messages: any[],
  modelProvider: string,
  accessToken?: string,
) => {
  return {
    model: modelName,
    messages,
    provider: modelProvider as Provider,
    accessToken,
  };
};

export const runPromptExecution = async ({
  accessToken,
  modelName,
  modelProvider,
  instruction,
  data,
  examples,
  timeout,
}: PromptExecutionParams): Promise<PromptExecutionResponse> => {
  const inputPrompt = materializePrompt({
    instruction,
    data,
    examples,
  });

  try {
    const response = await chatCompletion(
      createApiParams(
        modelName,
        [{ role: 'user', content: inputPrompt }],
        modelProvider,
        accessToken,
      ),
      {
        signal: AbortSignal.timeout(timeout ?? DEFAULT_TIMEOUT),
      },
    );
    return { value: response.choices[0].message.content };
  } catch (e) {
    let error: string;
    if (e instanceof Error) {
      error = e.message;
    } else {
      error = JSON.stringify(e);
    }
    return { error };
  }
};

export const runPromptExecutionStream = async function* ({
  accessToken,
  modelName,
  modelProvider,
  instruction,
  data,
  examples,
  timeout,
}: PromptExecutionParams): AsyncGenerator<PromptExecutionResponse> {
  const inputPrompt = materializePrompt({
    instruction,
    data,
    examples,
  });

  try {
    let accumulated = '';

    const stream = chatCompletionStream(
      createApiParams(
        modelName,
        [{ role: 'user', content: inputPrompt }],
        modelProvider,
        accessToken,
      ),
      {
        signal: AbortSignal.timeout(timeout ?? DEFAULT_TIMEOUT),
      },
    );

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const content = chunk.choices[0].delta.content;
        if (content) {
          accumulated += content;
          yield { value: accumulated, done: false };
        }
      }
    }

    yield { value: accumulated, done: true };
  } catch (e) {
    let error: string;
    if (e instanceof Error) {
      error = e.message;
    } else {
      error = JSON.stringify(e);
    }
    yield { error, done: true };
  }
};

export const runPromptExecutionStreamBatch = async function* (
  params: PromptExecutionParams[],
): AsyncGenerator<{ idx: number; response: PromptExecutionResponse }> {
  // Process in chunks based on concurrency
  const chunks = [];
  for (let i = 0; i < params.length; i += MAX_CONCURRENCY) {
    chunks.push(params.slice(i, i + MAX_CONCURRENCY));
  }

  for (const chunk of chunks) {
    const activeStreams = chunk.map(async function* (param) {
      for await (const response of runPromptExecutionStream(param)) {
        yield {
          idx: param.idx!,
          response,
        };
      }
    });

    // Process all streams concurrently
    const promises = activeStreams.map((stream) => stream.next());

    while (promises.length > 0) {
      const { value: result, index } = await Promise.race(
        promises.map((promise, index) =>
          promise.then((value) => ({ value, index })),
        ),
      );

      if (result.done) {
        // Remove completed stream
        promises.splice(index, 1);
        activeStreams.splice(index, 1);
      } else {
        // Yield the result and queue up next value from this stream
        yield result.value;
        promises[index] = activeStreams[index].next();
      }
    }
  }
};
