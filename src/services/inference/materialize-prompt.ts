import mustache from 'mustache';
import { EXAMPLES_PROMPT_CONTEXT_SIZE } from '~/config';

export interface Example {
  output: string;
  inputs: Record<string, string> | string;
  validated: boolean;
}

export interface MaterializePromptParams {
  instruction: string;
  sourcesContext?: {
    source_uri: string;
    text: string;
  }[];
  data?: object;
  examples?: Example[];
  renderInstruction?: boolean;
}

export function materializePrompt({
  instruction,
  sourcesContext,
  data,
  examples,
  renderInstruction = true,
}: MaterializePromptParams): string {
  return data && Object.keys(data).length > 0
    ? materializePromptFromData(
        instruction,
        data,
        sourcesContext,
        examples,
        renderInstruction,
      )
    : materializePromptFromScratch(instruction, sourcesContext, examples);
}

function materializePromptFromScratch(
  instruction: string,
  sourcesContext?: {
    source_uri: string;
    text: string;
  }[],
  examples?: Example[],
): string {
  const hasExamples = examples && examples.length > 0;

  const formattedExamples = formatExamples(
    examples,
    `
{{#examples}}
- {{output}}
{{/examples}}
`,
  );

  return mustache.render(
    `
# System Role
You are a rigorous text-generation engine. Generate only the requested output format, with no explanations following the user instruction. Prioritize originality and diversity with respect to the existing dataset (if available in the Current dataset section), and the adherence to constraints and the user instruction.

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

{{#hasSourcesContext}}
# Sources
Use the web sources below to accurately follow the user instruction. If the information is available in the source, you MUST NOT make up the requested information but instead extract and/or process the provided sources to ensure a truthful and accurate response. If the user instruction is about real-world facts or knowledge and can't be accurately fulfilled with the available sources, you should output with something like information not found in the sources.
## Source extract
{{#sourcesContext}}
- {{source_uri}}: {{text}}
{{/sourcesContext}}
{{/hasSourcesContext}}

{{#hasExamples}}
# Current dataset

Read carefully these data points to avoid repeating them and ensure diversity across the whole dataset. Data points are prior outputs to avoid mimicking. Treat them as exclusion criteria.

## Data points
{{formattedExamples}}

{{/hasExamples}}
# Output Format
Generate **only** the output requested in the user instruction. No additional introductions, explanations, or labels.

# Output
`,
    {
      instruction,
      formattedExamples: formattedExamples,
      hasExamples,
      hasSourcesContext: sourcesContext && sourcesContext.length > 0,
      sourcesContext: sourcesContext,
    },
    undefined,
    { escape: escapeValues },
  );
}

function materializePromptFromData(
  instruction: string,
  data: object,
  sourcesContext?: {
    source_uri: string;
    text: string;
  }[],
  examples?: Example[],
  renderInstruction = true,
): string {
  const hasExamples = examples && examples.length > 0;

  const formattedExamples = formatExamples(
    examples?.map((example) => ({
      ...example,
      inputs: Object.entries(example.inputs)
        .map(([col, val]) => `${col}: ${val}`)
        .join('\n'),
    })),
    `
{{#examples}}
## Example

**Input**:
{{inputs}}

**Output**:
{{output}}
  
{{/examples}}
`,
  );

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

{{#hasSourcesContext}}
# Sources
Use the web sources below to accurately follow the user instruction. If the information is available in the source, you MUST NOT make up the requested information but instead extract and/or process the provided sources to ensure a truthful and accurate response. If the user instruction is about real-world facts or knowledge and can't be accurately fulfilled with the available sources, you should output with something like information not found in the sources.
## Source extract
{{#sourcesContext}}
- {{source_uri}}: {{text}}
{{/sourcesContext}}
{{/hasSourcesContext}}

# Output
    `,
    {
      instruction: renderInstruction
        ? mustache.render(instruction, data, undefined, {
            escape: escapeValues,
          })
        : instruction,
      hasExamples,
      formattedExamples,
      hasSourcesContext: sourcesContext && sourcesContext.length > 0,
      sourcesContext: sourcesContext,
    },
  );
}

export const renderInstruction = (
  instruction: string,
  data: object,
): string => {
  return mustache.render(instruction, data, undefined, {
    escape: escapeValues,
  });
};

const escapeValues = (value: any): string => {
  if (typeof value === 'object' || Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return value;
};

const formatExamples = (
  examples: Example[] | undefined,
  template: string,
): string => {
  if (!examples || examples.length === 0) return '';

  const validatedExamples = examples.filter((example) => example.validated);
  const nonValidatedExamples = examples.filter((example) => !example.validated);

  const examplesText = mustache.render(
    template,
    {
      examples: [
        ...validatedExamples,
        ...nonValidatedExamples.sort(() => Math.random() - 0.5),
      ],
    },
    undefined,
    {
      escape: escapeValues,
    },
  );

  return examplesText.slice(0, EXAMPLES_PROMPT_CONTEXT_SIZE);
};
