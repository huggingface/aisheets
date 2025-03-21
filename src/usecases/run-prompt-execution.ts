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
) => ({
  model: modelName,
  messages,
  provider: modelProvider as InferenceProvider,
  accessToken,
});

const handleError = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  return JSON.stringify(e);
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

  console.log('\n🔷 Prompt Execution 🔷');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Model:', modelName);
  console.log('Provider:', modelProvider);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Prompt:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(inputPrompt);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔷 End Prompt 🔷\n');

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
    return { error: handleError(e) };
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

  console.log('\n🔷 Prompt Stream 🔷');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Model:', modelName);
  console.log('Provider:', modelProvider);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Prompt:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(inputPrompt);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔷 End Prompt 🔷\n');

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

export const runPromptExecutionStreamBatch = async function* (
  params: PromptExecutionParams[],
): AsyncGenerator<{ idx: number; response: PromptExecutionResponse }> {
  const queue = [...params];
  const activeStreams = new Map<
    number,
    AsyncGenerator<PromptExecutionResponse>
  >();
  const activePromises = new Map<
    number,
    Promise<IteratorResult<PromptExecutionResponse>>
  >();
  let streamIdCounter = 0;

  const startNewStream = () => {
    if (queue.length === 0) return false;

    const param = queue.shift()!;
    const streamId = streamIdCounter++;
    const stream = runPromptExecutionStream(param);

    activeStreams.set(streamId, stream);
    activePromises.set(streamId, stream.next());

    return { streamId, idx: param.idx! };
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
