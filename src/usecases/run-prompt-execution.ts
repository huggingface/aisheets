import { chatCompletion } from '@huggingface/inference';
import mustache from 'mustache';

export interface PromptExecutionParams {
  modelName: string;
  instruction: string;
  limit: number;
  offset: number;
}

export interface PromptExecutionResponse {
  value?: string;
  error?: string;
}

const promptTemplate = `
Generate a new response based on the following instruction. Be clear and concise in the response and do not generate any introductory text. Only the response is required.
## Instruction:
{{instruction}}

{{#examples}}
Find a way to generate the new response that is not similar to the examples below.
## Examples:
- {{examples}}
{{/examples}}

## Response:
`;

export const runPromptExecution = async ({
  modelName,
  instruction,
  limit,
  offset,
}: PromptExecutionParams): Promise<PromptExecutionResponse[]> => {
  const values = [];
  for (let i = offset; i < limit + offset; i++) {
    // Mustache template rendering
    const finalPrompt = mustache.render(promptTemplate, {
      instruction: instruction,
      examples: values
        .filter((v) => v.error !== null)
        .map((v) => v.value)
        .join('\n- '),
    });

    try {
      const response = await chatCompletion({
        model: modelName,
        messages: [{ role: 'user', content: finalPrompt }],
        accessToken: process.env.HF_TOKEN,
        seed: i,
      });

      values.push({ value: response.choices[0].message.content });
    } catch (e) {
      let error: string;
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = JSON.stringify(e);
      }
      values.push({ error });
    }
  }

  return Promise.all(values);
};
