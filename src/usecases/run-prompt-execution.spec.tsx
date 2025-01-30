import { expect, test } from 'vitest';
import {
  runPromptExecution,
  runPromptExecutionStream,
} from '~/usecases/run-prompt-execution';

const testModelName = 'google/gemma-2b-it';
const testPrompt = 'Write a short greeting';
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
