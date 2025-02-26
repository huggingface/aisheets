import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { type Dataset, useServerSession } from '~/state';

import consola from 'consola';
import { createCell, createColumn, createDataset } from '~/services';
import { describeFromURI, loadDatasetFromURI } from '~/services/repository/hub';
import { downloadDatasetFile } from '~/services/repository/hub/download-file';

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

    consola.info('Downloading file', repoId, filePath);
    const downloadedFilePath = await downloadDatasetFile({
      repoId,
      file: filePath,
      accessToken: session.token,
    });

    consola.info('Describing file columns', repoId, filePath);
    const fileInfo = await describeFromURI({
      uri: downloadedFilePath,
    });

    const totalRows = fileInfo.numberOfRows;
    const supportedColumns = fileInfo.columns;

    consola.info('File columns:', supportedColumns);
    consola.info('Total rows:', totalRows);

    if (supportedColumns.length === 0) {
      throw new Error('No supported columns found');
    }

    consola.info('Creating Dataset...');
    const createdDataset = await createDataset({
      name: `${repoId} [${filePath}]`,
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
        process: {
          columnsReferences: [],
          limit: 0,
          modelName: '',
          modelProvider: '',
          offset: 0,
          prompt: '',
        },
      });
      createdDataset.columns.push(createdColumn);
    }

    consola.info('Loading dataset rows');
    const { rows } = await loadDatasetFromURI({
      uri: downloadedFilePath,
      columnNames: supportedColumns.map((col) => col.name),
      limit: 1000,
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
