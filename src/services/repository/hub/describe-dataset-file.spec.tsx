import { describe, expect, it } from 'vitest';
import { describeDatasetFile } from './describe-dataset-file';

describe('describeDatasetSplit', () => {
  it('should return the column info for a dataset split', async () => {
    const columns = await describeDatasetFile({
      repoId: 'simplescaling/s1K',
      file: 'data/train-00000-of-00001.parquet',
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
