import { describe, expect, it } from 'vitest';
import { loadDataset } from './load-dataset';

const accessToken = process.env.HF_TOKEN;

describe.runIf(accessToken)(
  'loadDataset',
  () => {
    it('should load a dataset for a public dataset', async () => {
      const result = await loadDataset({
        repoid: 'open-thoughts/OpenThoughts-114k',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
      });

      expect(result).toBeDefined();
      expect(result.columns).toEqual([
        {
          name: 'system',
          type: {
            alias: undefined,
            typeId: 17,
          },
        },
        {
          name: 'conversations',
          type: {
            alias: undefined,
            typeId: 24,
            valueType: {
              alias: undefined,
              entryIndexes: {
                from: 0,
                value: 1,
              },
              entryNames: ['from', 'value'],
              entryTypes: [
                {
                  alias: undefined,
                  typeId: 17,
                },
                {
                  alias: undefined,
                  typeId: 17,
                },
              ],
              typeId: 25,
            },
          },
        },
      ]);

      expect(result.rows).toHaveLength(1000);
    });

    it('should read a dataset for a private dataset', async () => {
      const result = await loadDataset({
        repoid: 'frascuchon/awesome-chatgpt-prompts',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
      });

      expect(result).toBeDefined();
      expect(result.columns).toEqual([
        {
          name: 'act',
          type: {
            alias: undefined,
            typeId: 17,
          },
        },
        {
          name: 'prompt',
          type: {
            alias: undefined,
            typeId: 17,
          },
        },
      ]);

      expect(result.rows).toHaveLength(170);
    });
  },
  { timeout: 100000 },
);
