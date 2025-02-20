import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { type Dataset, useServerSession } from '~/state';

import consola from 'consola';
import { createCell, createColumn, createDataset } from '~/services';
import {
  describeDatasetFile,
  getDatasetInfo,
  loadDataset,
} from '~/services/repository/hub';

export interface ImportFromHubParams {
  repoId: string;
  filePath: string;
}

export const useImportFromHub = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    importParams: ImportFromHubParams,
  ): Promise<Dataset> {
    const { repoId, filePath } = importParams;
    const session = useServerSession(this);

    consola.info('Getting dataset info for repoId:', repoId);
    const datasetInfo = await getDatasetInfo({
      repoId,
      accessToken: session.token,
    });

    consola.info('Describing file columns', repoId, filePath);
    const splitColumns = await describeDatasetFile({
      repoId,
      file: filePath,
      accessToken: session.token,
    });

    const supportedColumns = splitColumns;

    if (supportedColumns.length === 0) {
      throw new Error('No supported columns found');
    }

    consola.info('Creating Dataset...');
    const createdDataset = await createDataset({
      name: repoId,
      // TODO: pass the user instead of the username and let the repository handle the createdBy
      createdBy: session.user.username,
    });

    consola.info('Creating columns...');
    for (const column of supportedColumns) {
      const createdColumn = await createColumn({
        dataset: createdDataset,
        name: column.name,
        type: 'text',
        kind: 'static',
      });
      createdDataset.columns.push(createdColumn);
    }

    consola.info('Loading dataset rows');
    const { rows } = await loadDataset({
      dataset: createdDataset,
      // TODO: Move all these parameters to a single object and link them to the created dataset.
      repoId,
      file: filePath,
      accessToken: session.token,
      // END TODO
      limit: 100,
      columnNames: supportedColumns.map((col) => col.name),
    });

    consola.info('Creating cells...');
    for (const row of rows) {
      for (const column of createdDataset.columns) {
        let value = row[column.name];

        if (Array.isArray(value) || typeof value === 'object') {
          value = JSON.stringify(value);
        }

        const createdCell = await createCell({
          cell: {
            idx: row.rowIdx,
            value,
          },
          column,
        });

        column.cells.push(createdCell);
      }
    }
    consola.info('Dataset created:', createdDataset);
    return createdDataset;
  });
