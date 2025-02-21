import { describe, expect, it } from 'vitest';
import { describeDatasetFile } from './describe-dataset-file';

const accessToken = process.env.HF_TOKEN;

describe('describeDatasetSplit', () => {
  it('should return the column info for a dataset split', async () => {
    const columns = await describeDatasetFile({
      repoId: 'simplescaling/s1K',
      file: 'data/train-00000-of-00001.parquet',
      accessToken: accessToken!,
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
