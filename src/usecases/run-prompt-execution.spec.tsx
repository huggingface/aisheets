import { describe, expect, it } from 'vitest';
import {
  runPromptExecution,
  runPromptExecutionStream,
} from './run-prompt-execution';

const testModelName = 'google/gemma-2b-it';
const testPrompt = 'Write a short greeting';
const accessToken = process.env.HF_TOKEN;

describe.runIf(accessToken)('runPromptExecution', () => {
  it('should generate a value', async () => {
    const result = await runPromptExecution({
      accessToken,
      modelName: testModelName,
      modelProvider: 'hf-inference',
      instruction: testPrompt,
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
    expect(result.value).not.toContain(testPrompt);
  });

  it('should generate 3 different values with the same prompt', async () => {
    const examples = ['example1', 'example2'].map((output) => ({
      output,
      inputs: { 'Column 1': 'some input' },
    }));

    const result = await runPromptExecution({
      accessToken,
      modelName: testModelName,
      modelProvider: 'hf-inference',
      instruction: testPrompt,
      examples,
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
    expect(examples).not.toContain(result.value);
  });

  it('should generate a value based on a data object', async () => {
    const data = {
      title: 'Cats are very cute',
    };
    const prompt =
      'Describe the title following title in 3 sentences:\n{{title}}';

    const result = await runPromptExecution({
      accessToken,
      modelName: testModelName,
      modelProvider: 'hf-inference',
      instruction: prompt,
      data,
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
  });
});

describe.runIf(accessToken)('stream', () => {
  it('should stream response with partial results', async () => {
    const updates = [];

    for await (const response of runPromptExecutionStream({
      accessToken,
      modelName: testModelName,
      modelProvider: 'hf-inference',
      instruction: testPrompt,
    })) {
      updates.push(response);
    }

    expect(updates.length).toBeGreaterThan(1);
    expect(updates[0].done).toBe(false);
    expect(updates[updates.length - 1].done).toBe(true);
    expect(updates[updates.length - 1].value).toBeDefined();
    expect(updates[0].value!.length).toBeLessThan(
      updates[updates.length - 1].value!.length,
    );
  });
});
