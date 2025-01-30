import { HfInference } from '@huggingface/inference';
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
Find a way to generate the new response that is not similar to the examples below.
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
): string => {
  return mustache.render(
    `
Generate a new response based on the following instruction. Be clear and concise in the response and do not generate any introductory text. Only the response is required.

## Instruction:
{{instruction}}

## Response:
    `,
    {
      instruction: mustache.render(instruction, data),
    },
  );
};

export const runPromptExecution = async ({
  accessToken,
  modelName,
  instruction,
  data,
  examples,
  stream = false,
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
    const hf = new HfInference(accessToken);

    if (stream) {
      let out = '';
      const stream = hf.chatCompletionStream({
        model: modelName,
        messages: [{ role: 'user', content: inputPrompt }],
        max_tokens: 512,
        temperature: 0.1,
      });

      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
          const content = chunk.choices[0].delta.content;
          if (content) {
            out += content;
          }
        }
      }
      return { value: out, done: true };
    }

    const response = await hf.chatCompletion({
      model: modelName,
      messages: [{ role: 'user', content: inputPrompt }],
    });
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
    const hf = new HfInference(accessToken);
    let accumulated = '';

    const stream = hf.chatCompletionStream({
      model: modelName,
      messages: [{ role: 'user', content: inputPrompt }],
      max_tokens: 512,
      temperature: 0.1,
    });

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
