import { textGeneration } from '@huggingface/inference';
import mustache from 'mustache';

export interface PromptExecutionParams {
  modelName: string;
  instruction: string;
  limit: number;
  offset: number;
}

export interface PromptExecutionResponse {
  value: string;
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
      const response = await textGeneration({
        model: modelName,
        inputs: finalPrompt,
        // From user access token currentUser.accessToken
        accessToken:
          process.env.HF_TOKEN,
        parameters: {
          return_full_text: false,
          seed: i,
        },
      });
      values.push({
        value: response.generated_text,
      });
    } catch (e) {
      if (e instanceof Error) {
        values.push({
          value: '',
          error: e.message,
        });
      } else {
        values.push({
          value: '',
          error: 'Unknown error',
        });
      }
    }
  }
  return Promise.all(values);
};
