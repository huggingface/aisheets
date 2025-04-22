import fs from 'node:fs/promises';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getDatasetById } from '~/services/repository/datasets';
import { exportDatasetTableRows } from '~/services/repository/tables';
import { type Dataset, useServerSession } from '~/state';

export const useGenerateCSVFile = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    {
      dataset,
    }: {
      dataset: Dataset;
    },
  ): Promise<any> {
    useServerSession(this);

    const foundDataset = await getDatasetById(dataset.id);
    if (!foundDataset) throw new Error('Dataset not found');

    let csvFile: string | undefined;

    try {
      csvFile = await exportDatasetTableRows({
        dataset,
        columns: dataset.columns.map((column) => ({
          id: column.id,
          name: column.name,
        })),
        format: 'csv',
      });

      return await fs.readFile(csvFile, 'utf-8');
    } finally {
      if (csvFile) await fs.unlink(csvFile);
    }
  });
