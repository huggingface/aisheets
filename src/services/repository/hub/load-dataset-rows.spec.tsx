import { describe, expect, it } from 'vitest';
import { loadDatasetRows } from './load-dataset-rows';

const accessToken = process.env.HF_TOKEN;

describe.runIf(accessToken)(
  'loadDatasetRows',
  () => {
    it('should load a dataset for a public dataset', async () => {
      const result = await loadDatasetRows({
        repoid: 'open-thoughts/OpenThoughts-114k',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(500);
    });

    it('should read a dataset for a private dataset', async () => {
      const result = await loadDatasetRows({
        repoid: 'frascuchon/awesome-chatgpt-prompts',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
        limit: 50,
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(50);
    });

    it("should read class labels for a dataset with 'labels' column", async (t) => {
      t.skip();

      const result = await loadDatasetRows({
        repoid: 'argilla/synthetic-domain-text-classification',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
      });

      expect(result).toBeDefined();
    });
  },
  { timeout: 10000 },
);
