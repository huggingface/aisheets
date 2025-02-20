import { afterEach, describe, expect, it } from 'vitest';
import { DatasetModel } from '~/services/db/models';
import { loadDataset } from './load-dataset';

const accessToken = process.env.HF_TOKEN;

afterEach(async () => {
  await DatasetModel.destroy({ where: {} });
});

describe.runIf(accessToken)(
  'loadDataset',
  () => {
    it('should load a dataset for a public dataset', async () => {
      const model = await DatasetModel.create({
        name: 'Test Dataset',
        createdBy: 'test',
      });

      const result = await loadDataset({
        dataset: {
          id: model.id,
          name: model.name,
          createdBy: model.createdBy,
          columns: [],
        },
        repoId: 'open-thoughts/OpenThoughts-114k',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
        limit: 500,
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(500);
    });

    it('should read a dataset for a private dataset', async () => {
      const model = await DatasetModel.create({
        name: 'Test Dataset',
        createdBy: 'test',
      });

      const result = await loadDataset({
        dataset: {
          id: model.id,
          name: model.name,
          createdBy: model.createdBy,
          columns: [],
        },
        repoId: 'frascuchon/awesome-chatgpt-prompts',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
        limit: 50,
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(50);
    });

    it('should load rows with rowIdx attribute', async (t) => {
      const model = await DatasetModel.create({
        name: 'Test Dataset',
        createdBy: 'test',
      });

      const result = await loadDataset({
        dataset: {
          id: model.id,
          name: model.name,
          createdBy: model.createdBy,
          columns: [],
        },
        repoId: 'argilla/magpie-ultra-v1.0',
        accessToken: accessToken!,
        parquetFiles: ['default/train/0000.parquet'],
        offset: 500,
        limit: 5,
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(5);
      expect(result.rows.map((row) => row.rowIdx)).toEqual([
        500, 501, 502, 503, 504,
      ]);
    });

    it('should load rows with provided columns', async () => {
      const model = await DatasetModel.create({
        name: 'Test Dataset',
        createdBy: 'test',
      });

      const result = await loadDataset({
        dataset: {
          id: model.id,
          name: model.name,
          createdBy: model.createdBy,
          columns: [],
        },
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
  { timeout: 30000 },
);
