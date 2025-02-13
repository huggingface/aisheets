import { describe, expect, it } from 'vitest';
import { loadDatasetRows } from './load-dataset-rows';

const accessToken = process.env.HF_TOKEN;

describe.runIf(accessToken)(
  'loadDatasetRows',
  () => {
    it('should load a dataset for a public dataset', async () => {
      const result = await loadDatasetRows({
        repoId: 'open-thoughts/OpenThoughts-114k',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(500);
    });

    it('should read a dataset for a private dataset', async () => {
      const result = await loadDatasetRows({
        repoId: 'frascuchon/awesome-chatgpt-prompts',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
        limit: 50,
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(50);
    });

    it('should load rows with idx attribute', async (t) => {
      const result = await loadDatasetRows({
        repoId: 'argilla/magpie-ultra-v1.0',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
        offset: 500,
        limit: 5,
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(5);
      expect(result.rows.map((row) => row.idx)).toEqual([
        500, 501, 502, 503, 504,
      ]);
    });

    it('should load rows with provided columns', async () => {
      const result = await loadDatasetRows({
        repoId: 'argilla/magpie-ultra-v1.0',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
        columnNames: ['system_prompt_key', 'instruction'],
        limit: 1,
      });

      expect(result).toBeDefined();
      expect(Object.keys(result.rows[0])).toHaveLength(3);
      expect(result.rows[0]).toHaveProperty('system_prompt_key');
      expect(result.rows[0]).toHaveProperty('instruction');
    });
  },
  { timeout: 15000 },
);
