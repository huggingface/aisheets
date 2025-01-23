import { expect, test } from 'vitest';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

const testModelName = 'meta-llama/Llama-2-7b-chat-hf';
const testPrompt = 'Generate a title for a blog post about cats';

const accessToken = process.env.HF_TOKEN;

test('should generate a value', async () => {
  const result = await runPromptExecution({
    accessToken,
    modelName: testModelName,
    instruction: testPrompt,
  });

  expect(result.error).toBeUndefined();
  expect(result.value).toBeDefined();
  expect(result.value).not.toContain(testPrompt);
});

test('should generate 3 different values with the same prompt', async () => {
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
