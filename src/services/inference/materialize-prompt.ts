import mustache from 'mustache';
import {
  EXAMPLES_PROMPT_MAX_CONTEXT_SIZE,
  SOURCES_PROMPT_MAX_CONTEXT_SIZE,
} from '~/config';

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
}: MaterializePromptParams): string {
  return data && Object.keys(data).length > 0
    ? materializePromptFromData(instruction, data, sourcesContext, examples)
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
  const uniqueExamples = new Map<string, Example>();

  const examplesTemplate = `# Previous responses
Review these responses and **generate a new response that is NOT present in this list. Provide only ONE new, unique entry.**
Use the different source contexts indistinctly to generate a new response that is not present in the list below. DO NOT show the reasoning behind your response, just the output.

{{#examples}}
- {{output}}
{{/examples}}

Generate your response without repeting any of the responses above.
If it's not possible to add a new response, tell the user: No more items and the reason.
`;

  if (examples) {
    for (const example of examples) {
      if (!uniqueExamples.has(example.output) || example.validated) {
        uniqueExamples.set(example.output, example);
      }
    }
  }
  const dedupedExamples = Array.from(uniqueExamples.values());

  return mustache.render(
    `
You are a rigorous text-generation engine. Generate only the requested output format, with no explanations following the user instruction and avoiding repetition of the existing responses at the end of the prompt.

# User Instruction
{{instruction}}

{{sourcesSection}}

{{examplesSection}}

# Your response
`,
    {
      instruction,
      examplesSection: examplesSection(dedupedExamples, examplesTemplate),
      sourcesSection: sourcesSection(sourcesContext),
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
): string {
  const examplesTemplate = `# Examples
The following are correct, accurate example outputs with respect to the user instruction:

{{#examples}}
## Example
### Input
{{inputs}}
### Output
{{output}}
{{/examples}}
`;

  return mustache.render(
    `
You are a rigorous, intelligent data-processing engine. Generate only the requested response format, with no explanations following the user instruction. You might be provided with positive, accurate examples of how the user instruction must be completed.

{{examplesSection}}

# User instruction
{{instruction}}

{{sourcesSection}}

# Your response
    `,
    {
      instruction: renderInstruction(instruction, data),
      examplesSection: examplesSection(
        examples?.map((example) => ({
          ...example,
          inputs: Object.entries(example.inputs)
            .map(([col, val]) => `${col}: ${val}`)
            .join('\n'),
        })),
        examplesTemplate,
      ),
      sourcesSection: sourcesSection(sourcesContext),
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

const examplesSection = (
  examples: Example[] | undefined,
  template: string,
): string => {
  if (!examples || examples.length === 0) return '';

  const validatedExamples = examples.filter((example) => example.validated);
  const nonValidatedExamples = examples.filter((example) => !example.validated);

  const examplesText = mustache.render(
    template,
    {
      examples: [...validatedExamples, ...nonValidatedExamples],
    },
    undefined,
    {
      escape: escapeValues,
    },
  );

  return examplesText.slice(0, EXAMPLES_PROMPT_MAX_CONTEXT_SIZE);
};

const sourcesSection = (
  sources: { source_uri: string; text: string }[] | undefined,
): string => {
  if (!sources || sources.length === 0) return '';

  const uniqueSources = new Map<string, { source_uri: string; text: string }>();
  for (const source of sources) {
    const key = (source.source_uri + source.text).toLowerCase();
    if (!uniqueSources.has(key)) {
      uniqueSources.set(key, source);
    }
  }

  if (uniqueSources.size === 0) return '';

  const sourcesText = mustache.render(
    `# Sources
Use the web sources below to accurately follow the user instruction. If the information is available in the source, you MUST NOT make up the requested information but instead extract and/or process the provided sources to ensure a truthful and accurate response. If the user instruction is about real-world facts or knowledge and can't be accurately fulfilled with the available sources, you can respond if you're sure about factuality but you have not used information provided in the sources.

## Sources extract
{{#sourcesContext}}
### URI
{{source_uri}}
### extract
{{text}}
{{/sourcesContext}}
`,
    {
      sourcesContext: Array.from(uniqueSources.values()),
    },
    undefined,
    {
      escape: escapeValues,
    },
  );

  return sourcesText.slice(0, SOURCES_PROMPT_MAX_CONTEXT_SIZE);
};
