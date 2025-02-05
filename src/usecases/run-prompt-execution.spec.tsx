import { describe, it } from 'node:test';
import { expect } from 'vitest';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

const testModelName = 'google/gemma-2b-it';
const testPrompt = 'Write a short greeting';
const accessToken = process.env.HF_TOKEN;

describe('runPromptExecution', () => {
  it('should generate a value', async () => {
    const result = await runPromptExecution({
      accessToken,
      modelName: testModelName,
      instruction: testPrompt,
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
    expect(result.value).not.toContain(testPrompt);
  });

  it('should generate 3 different values with the same prompt', async () => {
    const examples = [
      'Title: Cats are the best',
      'About our Feline friends',
      'The best cats in the world',
    ];

    const result = await runPromptExecution({
      accessToken,
      modelName: testModelName,
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
      instruction: prompt,
      data,
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
  });
});

describe('stream', () => {
  test('should stream response with partial results', async () => {
    const updates: PromptExecutionResponse[] = [];

    for await (const response of runPromptExecutionStream({
      accessToken,
      modelName: testModelName,
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
