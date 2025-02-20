import { describe, expect, it } from 'vitest';
import { getDatasetInfo } from './get-dataset-info';

const accessToken = process.env.HF_TOKEN;

describe.runIf(accessToken)(
  'getDatasetInfo',
  () => {
    it('should return subsets with splits and parquet files for a public dataset', async () => {
      const result = await getDatasetInfo({
        repoId: 'argilla/synthetic-domain-text-classification',
        accessToken: accessToken!,
      });

      expect(result).toEqual({
        subsets: [
          {
            name: 'default',
            splits: [
              {
                name: 'train',
                files: ['default/train/0000.parquet'],
              },
            ],
          },
        ],
      });
    });

    it('should return subsets with splits and parquet files for a private dataset', async () => {
      const result = await getDatasetInfo({
        repoId: 'frascuchon/new_finepersonas-v0.1-tiny-flux-schnell',
        accessToken: accessToken!,
      });

      expect(result).toEqual({
        subsets: [
          {
            name: 'default',
            splits: [
              {
                name: 'train',
                files: ['default/train/0000.parquet'],
              },
            ],
          },
        ],
      });
    });
  },
  { timeout: 100000 },
);
