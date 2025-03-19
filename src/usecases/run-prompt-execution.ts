import {
  type InferenceProvider,
  chatCompletion,
  chatCompletionStream,
} from '@huggingface/inference';
import { INFERENCE_TIMEOUT, NUM_CONCURRENT_REQUESTS } from '~/config';
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

const MAX_CONCURRENCY = Math.min(NUM_CONCURRENT_REQUESTS, 10);

const createApiParams = (
  modelName: string,
  messages: any[],
  modelProvider: string,
  accessToken?: string,
) => {
  return {
    model: modelName,
    messages,
    provider: modelProvider as InferenceProvider,
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
        signal: AbortSignal.timeout(timeout ?? INFERENCE_TIMEOUT),
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
        signal: AbortSignal.timeout(timeout ?? INFERENCE_TIMEOUT),
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
  const queue = [...params];
  const activeStreams: Map<
    number,
    AsyncGenerator<PromptExecutionResponse>
  > = new Map();
  const activePromises: Map<
    number,
    Promise<IteratorResult<PromptExecutionResponse>>
  > = new Map();
  let streamIdCounter = 0;

  const startNewStream = () => {
    if (queue.length === 0) return false;

    const param = queue.shift()!;
    const streamId = streamIdCounter++;
    const stream = runPromptExecutionStream(param);

    activeStreams.set(streamId, stream);
    activePromises.set(streamId, stream.next());

    return {
      streamId,
      idx: param.idx!,
    };
  };

  const initialStreamCount = Math.min(MAX_CONCURRENCY, queue.length);
  const streamIdxMap = new Map<number, number>();

  for (let i = 0; i < initialStreamCount; i++) {
    const result = startNewStream();
    if (result) {
      streamIdxMap.set(result.streamId, result.idx);
    }
  }

  while (activePromises.size > 0) {
    const streamIds = Array.from(activePromises.keys());
    const promises = streamIds.map((id) => activePromises.get(id)!);

    const { value: result, index } = await Promise.race(
      promises.map((promise, index) =>
        promise.then((value) => ({ value, index })),
      ),
    );

    const streamId = streamIds[index];
    const idx = streamIdxMap.get(streamId)!;

    if (result.done) {
      activeStreams.delete(streamId);
      activePromises.delete(streamId);
      streamIdxMap.delete(streamId);

      const newStream = startNewStream();
      if (newStream) {
        streamIdxMap.set(newStream.streamId, newStream.idx);
      }
    } else {
      yield { idx, response: result.value };

      activePromises.set(streamId, activeStreams.get(streamId)!.next());
    }
  }
};
