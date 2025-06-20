import fs from 'node:fs/promises';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getDatasetById } from '~/services/repository/datasets';
import { exportDatasetTableRows } from '~/services/repository/tables';
import { type Dataset, useServerSession } from '~/state';

export const useGenerateFile = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    {
      dataset,
      format = 'csv',
    }: {
      dataset: Dataset;
      format?: 'csv' | 'parquet';
    },
  ): Promise<any> {
    useServerSession(this);

    const foundDataset = await getDatasetById(dataset.id);
    if (!foundDataset) throw new Error('Dataset not found');

    let file: string | undefined;

    try {
      file = await exportDatasetTableRows({
        dataset,
        columns: dataset.columns,
        format,
      });

      return await fs.readFile(file);
    } finally {
      if (file) await fs.unlink(file);
    }
  });
