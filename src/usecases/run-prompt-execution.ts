import { chatCompletion, chatCompletionStream } from '@huggingface/inference';
import mustache from 'mustache';

export interface PromptExecutionParams {
  accessToken?: string;
  modelName: string;
  modelProvider: string;
  instruction: string;
  data?: object;
  examples?: Array<{ output: string; inputs: Record<string, string> }>;
  stream?: boolean;
  timeout?: number;
}

export interface PromptExecutionResponse {
  value?: string;
  error?: string;
  done?: boolean;
}

const promptForResponseFromScratch = (
  instruction: string,
  examples?: Array<{ output: string; inputs: Record<string, string> }>,
): string => {
  // Convert complex examples to simple strings (just outputs)
  const outputExamples = examples?.map((ex) => ex.output);

  return mustache.render(
    `
# System Role
You are a rigorous text-generation engine. Generate only the requested output format, with no explanations following the user instruction. Prioritize originality and diversity with respect to the existing dataset, and the adherence to constraints and the user instruction.

# Core Constraints (Always Apply)

## Dynamic Topic/Style Diversity

- Avoid repeating subtopics, styles, or language patterns from prior examples (e.g., if data points already cover a specific topic, area, approach, find something completely original and distinct).

## Language Originality

- Never reuse phrasing, verbs, or sentence structures from examples.

- Avoid adjacent terminology (e.g., if examples use "neural networks," avoid "machine learning models").

## Dataset-Aware Cross-Checking and Diversity
Ensure your output differs meaningfully from the existing data points in topic, content, tone, and structure, depending on the user instruction.

# User Instruction
{{instruction}}

{{#examples}}
# Current dataset
Read carefully these data points to avoid repeating them and ensure diversity across the whole dataset. Data points are prior outputs to avoid mimicking. Treat them as exclusion criteria.
## Data points
{{#.}}
- {{.}}
{{/.}}
{{/examples}}

# Output Format
Generate **only** the output requested in the user instruction. No additional introductions, explanations, or labels.

# Output
`,
    { instruction, examples: outputExamples ? [outputExamples] : undefined },
  );
};

const promptForResponseFromData = (
  instruction: string,
  data: object,
  examples?: Array<{ output: string; inputs: Record<string, string> }>,
): string => {
  // Format all examples together as one string
  const formattedExamples = examples
    ?.map((example) => {
      const inputsText = Object.entries(example.inputs)
        .map(([col, val]) => `${col}: ${val}`)
        .join('\n');

      return `## Example
**Input**:
${inputsText}

**Output**:
${example.output}`;
    })
    .join('\n\n');
  return mustache.render(
    `
# System role
You are a rigorous, intelligent data-processing engine. Generate only the requested output format, with no explanations following the user instruction. You might be provided with positive, accurate examples of how the user instruction must be completed.

{{#hasExamples}}
# Examples
The following are correct, accurate example outputs with respect to the user instruction:

{{{formattedExamples}}}
{{/hasExamples}}

# User instruction
{{instruction}}

# Output
    `,
    {
      instruction: mustache.render(instruction, data),
      hasExamples: examples && examples.length > 0,
      formattedExamples,
    },
  );
};

const DEFAULT_TIMEOUT = 60000;

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
  let inputPrompt: string;
  switch (data && Object.keys(data).length > 0) {
    case true:
      inputPrompt = promptForResponseFromData(instruction, data!, examples);
      break;
    default:
      inputPrompt = promptForResponseFromScratch(instruction, examples);
      break;
  }

  //console.log('Sending prompt to server:', inputPrompt);

  try {
    // https://huggingface.co/docs/api-inference/tasks/chat-completion?code=js#api-specification

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
  let inputPrompt: string;
  switch (data && Object.keys(data).length > 0) {
    case true:
      inputPrompt = promptForResponseFromData(instruction, data!, examples);
      break;
    default:
      inputPrompt = promptForResponseFromScratch(instruction, examples);
      break;
  }

  //console.log('Sending prompt to server:', inputPrompt);

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
