import { chatCompletion } from '@huggingface/inference';
import mustache from 'mustache';

export interface PromptExecutionParams {
  accessToken?: string;
  modelName: string;
  instruction: string;
  data?: object;
  examples?: string[];
}

export interface PromptExecutionResponse {
  value?: string;
  error?: string;
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
    const response = await chatCompletion({
      model: modelName,
      messages: [{ role: 'user', content: inputPrompt }],
      accessToken: accessToken,
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
