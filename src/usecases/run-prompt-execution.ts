import { chatCompletion, chatCompletionStream } from '@huggingface/inference';
import mustache from 'mustache';

export interface PromptExecutionParams {
  accessToken?: string;
  modelName: string;
  instruction: string;
  data?: object;
  examples?: string[];
  stream?: boolean;
}

export interface PromptExecutionResponse {
  value?: string;
  error?: string;
  done?: boolean;
}

const promptForResponseFromScratch = (
  instruction: string,
  examples?: string[],
): string => {
  return mustache.render(
    `
Generate a new response based on the following instruction. Be clear and concise in the response and do not generate any introductory text. Only the response is required.
## Instruction:
{{instruction}}

{{#examples}}
Find a way to generate the new response similar to the examples below.
## Examples:
- {{examples}}
{{/examples}}

## Response:
`,
    { instruction, examples: examples?.join('\n- ') },
  );
};

const promptForResponseFromData = (
  instruction: string,
  data: object,
  examples?: string[],
): string => {
  return mustache.render(
    `
{{#examples}}
# Example
Guide you by these examples to complete the task
- {{examples}}
{{/examples}}
{{^examples}}
# Introduction
Generate a new response based on the following task. Be clear and concise in 
the response and do not generate any introductory text. Only a clear response is required.
{{/examples}}

# Task
{{instruction}}

# Response
    `,
    {
      instruction: mustache.render(instruction, data),
      examples: examples?.join('\n- '),
    },
  );
};

export const runPromptExecution = async ({
  accessToken,
  modelName,
  instruction,
  data,
  examples,
}: PromptExecutionParams): Promise<PromptExecutionResponse> => {
  let inputPrompt: string;
  switch (data && Object.keys(data).length > 0) {
    case true:
      inputPrompt = promptForResponseFromData(instruction, data!);
      break;
    default:
      inputPrompt = promptForResponseFromScratch(instruction, examples);
      break;
  }

  try {
    // https://huggingface.co/docs/api-inference/tasks/chat-completion?code=js#api-specification
    const response = await chatCompletion(
      {
        model: modelName,
        messages: [{ role: 'user', content: inputPrompt }],
        accessToken,
      },
      {
        use_cache: false,
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
  instruction,
  data,
  examples,
}: PromptExecutionParams): AsyncGenerator<PromptExecutionResponse> {
  let inputPrompt: string;
  switch (data && Object.keys(data).length > 0) {
    case true:
      inputPrompt = promptForResponseFromData(instruction, data!);
      break;
    default:
      inputPrompt = promptForResponseFromScratch(instruction, examples);
      break;
  }

  try {
    let accumulated = '';

    const stream = chatCompletionStream(
      {
        model: modelName,
        messages: [{ role: 'user', content: inputPrompt }],
        accessToken,
      },
      { use_cache: false },
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
