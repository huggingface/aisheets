import { describe, expect, it } from 'vitest';
import { describeDatasetSplit } from './describe-dataset-split';

const accessToken = process.env.HF_TOKEN;

describe.runIf(accessToken)('describeDatasetSplit', () => {
  it('should return the column info for a dataset split', async () => {
    const columns = await describeDatasetSplit({
      repoId: 'simplescaling/s1K',
      accessToken: accessToken!,
      subset: 'default',
      split: 'train',
    });

    expect(columns).toEqual([
      {
        name: 'solution',
        type: 'VARCHAR',
      },
      {
        name: 'question',
        type: 'VARCHAR',
      },
      {
        name: 'cot_type',
        type: 'VARCHAR',
      },
      {
        name: 'source_type',
        type: 'VARCHAR',
      },
      {
        name: 'metadata',
        type: 'VARCHAR',
      },
      {
        name: 'cot',
        type: 'INTEGER',
      },
      {
        name: 'thinking_trajectories',
        type: 'VARCHAR[]',
      },
      {
        name: 'attempt',
        type: 'VARCHAR',
      },
    ]);
  });
});
