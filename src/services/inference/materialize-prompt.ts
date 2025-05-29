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

  const uniqueExamples = new Map<string, Example>();
  if (examples) {
    for (const example of examples) {
      if (!uniqueExamples.has(example.output) || example.validated) {
        uniqueExamples.set(example.output, example);
      }
    }
  }
  const dedupedExamples = Array.from(uniqueExamples.values());

  const formattedExamples = formatExamples(
    dedupedExamples,
    `
{{#examples}}
- {{output}}
{{/examples}}
`,
  );

  return mustache.render(
    `
You are a rigorous text-generation engine. Generate only the requested output format, with no explanations following the user instruction. Prioritize originality and diversity.

{{#hasExamples}}
## Avoid duplication

Carefully review the existing responses and **generate a new response that is NOT present in this list. Provide only ONE new, unique entry.**

### Previous responses
{{formattedExamples}}

{{/hasExamples}}

# User Instruction
{{instruction}}

{{#hasSourcesContext}}
## Sources
Use the web sources below to accurately follow the user instruction. If the information is available in the source, you MUST NOT make up the requested information but instead extract and/or process the provided sources to ensure a truthful and accurate response. If the user instruction is about real-world facts or knowledge and can't be accurately fulfilled with the available sources, you can respond if you're sure about factuality but you have not used information provided in the sources.
## Source extract
{{#sourcesContext}}
- {{source_uri}}: {{text}}
{{/sourcesContext}}
{{/hasSourcesContext}}

## Output Format
Generate **only** the output requested in the user instruction. No additional introductions, explanations, or labels. 

## Your response
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
Use the web sources below to accurately follow the user instruction. If the information is available in the source, you MUST NOT make up the requested information but instead extract and/or process the provided sources to ensure a truthful and accurate response. If the user instruction is about real-world facts or knowledge and can't be accurately fulfilled with the available sources, you can respond if you're sure about factuality but you have not used information provided in the sources.
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
  data: Record<string, any>,
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
