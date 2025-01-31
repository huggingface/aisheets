import { describe, it } from 'node:test';
import { expect } from 'vitest';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

const testModelName = 'meta-llama/Llama-2-7b-chat-hf';
const testPrompt = 'Generate a title for a blog post about cats';

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

  it('should genenrate a value based on a data object', async () => {
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
