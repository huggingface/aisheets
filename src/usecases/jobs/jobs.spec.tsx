import { describe, expect, it } from 'vitest';
import { augmentDatasetJob } from './jobs';

const accessToken = process.env.HF_TOKEN;
describe.runIf(accessToken)('run job', () => {
  it('should run a job successfully', async () => {
    const result = await augmentDatasetJob({
      accessToken: accessToken!,
      source: { repoId: 'data-agents/jupyter-agent-dataset' },
      target: { repoId: 'frascuchon/augmented-dataset' },
      config: {
        columns: {
          translation: {
            modelName: 'Helsinki-NLP/opus-mt-en-fr',
            modelProvider: 'huggingface',
            userPrompt: 'Translate the following text to French: {{text}}',
            prompt: 'Translate the following text to French: {{text}}',
            columnsReferences: ['text'],
          },
        },
      },
    });

    console.log('Job result:', result);
    expect(result).toBeDefined();
    expect(result!.length).toBeGreaterThan(0);
  });
});
