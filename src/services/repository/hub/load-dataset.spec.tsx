import { afterEach, describe, expect, it } from 'vitest';
import { DatasetModel } from '~/services/db/models';
import { loadDatasetFromURI } from './load-dataset';

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

      const uri =
        'hf://datasets/open-thoughts/OpenThoughts-114k/data/train-00000-of-00006.parquet';

      const result = await loadDatasetFromURI({
        uri,
        limit: 500,
      });

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(500);
    });

    it('should read a dataset for a private dataset', async (t) => {
      t.skip(); // The dataset is is private and we still need to resolve errors running in the HF spaces

      const model = await DatasetModel.create({
        name: 'Test Dataset',
        createdBy: 'test',
      });
      const uri =
        'hf://datasets/argilla/magpie-ultra-v1.0/data/train-00000-of-00056.parquet';

      const result = await loadDatasetFromURI({
        uri,
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

      const result = await loadDatasetFromURI({
        uri: 'hf://datasets/argilla/magpie-ultra-v1.0/data/train-00000-of-00056.parquet',
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

      const result = await loadDatasetFromURI({
        uri: 'hf://datasets/argilla/magpie-ultra-v1.0/data/train-00000-of-00056.parquet',
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
