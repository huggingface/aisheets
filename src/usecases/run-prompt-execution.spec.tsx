import { expect, test } from 'vitest';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

const testModelName = 'meta-llama/Llama-2-7b-chat-hf';
const testPrompt = 'Generate a title for a blog post about cats';

test('should generate one single value', async () => {
  const result = await runPromptExecution({
    modelName: testModelName,
    instruction: testPrompt,
    offset: 0,
    limit: 1,
  });

  expect(result).toHaveLength(1);
  expect(result[0].error).toBeUndefined();
  expect(result[0].value).toBeDefined();
  expect(result[0].value).not.toContain(testPrompt);
});

test('should generate 3 different values with the same prompt', async () => {
  const result = await runPromptExecution({
    modelName: 'meta-llama/Llama-2-7b-chat-hf',
    instruction: testPrompt,
    offset: 0,
    limit: 3,
  });

  expect(result).toHaveLength(3);

  expect(result[1].error).toBeUndefined();
  expect(result[0].error).toBeUndefined();
  expect(result[2].error).toBeUndefined();

  expect(result[0].value).toBeDefined();
  expect(result[1].value).toBeDefined();
  expect(result[2].value).toBeDefined();

  expect(result[0].value).not.toEqual(result[1].value);
  expect(result[0].value).not.toEqual(result[2].value);
  expect(result[1].value).not.toEqual(result[2].value);
});
