import mustache from 'mustache';

export interface Example {
  output: string;
  inputs: Record<string, string>;
}

export interface MaterializePromptParams {
  instruction: string;
  data?: object;
  examples?: Example[];
  renderInstruction?: boolean;
}

export function materializePrompt({
  instruction,
  data,
  examples,
  renderInstruction = true,
}: MaterializePromptParams): string {
  return data && Object.keys(data).length > 0
    ? materializePromptFromData(instruction, data, examples, renderInstruction)
    : materializePromptFromScratch(instruction, examples);
}

function materializePromptFromScratch(
  instruction: string,
  examples?: Example[],
): string {
  const outputExamples = examples?.map((ex) => ex.output);

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

{{#hasExamples}}
# Current dataset
Read carefully these data points to avoid repeating them and ensure diversity across the whole dataset. Data points are prior outputs to avoid mimicking. Treat them as exclusion criteria.
## Data points
{{#examples}}
- {{.}}
{{/examples}}
{{/hasExamples}}

# Output Format
Generate **only** the output requested in the user instruction. No additional introductions, explanations, or labels.

# Output
`,
    {
      instruction,
      examples: outputExamples,
      hasExamples: outputExamples && outputExamples.length > 0,
    },
  );
}

function materializePromptFromData(
  instruction: string,
  data: object,
  examples?: Example[],
  renderInstruction = true,
): string {
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
      instruction: renderInstruction
        ? mustache.render(instruction, data)
        : instruction,
      hasExamples: examples && examples.length > 0,
      formattedExamples,
    },
  );
}
