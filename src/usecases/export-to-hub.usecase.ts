import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'yaml';

import { type HubApiError, createRepo, uploadFiles } from '@huggingface/hub';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getDatasetById } from '~/services/repository/datasets';
import { exportDatasetTableRows } from '~/services/repository/tables';
import { describeTableColumns } from '~/services/repository/tables/describe-table-columns';
import { type Dataset, useServerSession } from '~/state';
import { generateDatasetConfig } from './create-dataset-config';

export interface ExportDatasetParams {
  dataset: Dataset;
  owner?: string;
  name: string;
  private: boolean;
}

export const useExportDataset = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    exportParams: ExportDatasetParams,
  ): Promise<string> {
    const { dataset, name, owner: requestedOwner } = exportParams;
    const session = useServerSession(this);
    const foundDataset = await getDatasetById(dataset.id);

    if (!foundDataset) {
      throw new Error('Dataset not found');
    }

    const configPath = await createDatasetConfig(foundDataset);
    const parquetFile = await exportDatasetTableRows({
      dataset: foundDataset,
      columns: dataset.columns,
    });

    const owner = requestedOwner || session.user.username;
    const repoId = `${owner}/${name}`;

    const readme = await readmeContent(foundDataset);

    try {
      await createRepo({
        repo: { type: 'dataset', name: repoId },
        private: exportParams.private,
        accessToken: session.token,
        files: [
          {
            path: 'README.md',
            content: new Blob([readme]),
          },
        ],
      });
    } catch (error) {
      if ((error as HubApiError).statusCode !== 409) {
        throw error;
      }
    }

    try {
      await uploadFiles({
        repo: { type: 'dataset', name: repoId },
        accessToken: session.token,
        files: [
          {
            path: 'data/train.parquet',
            content: new Blob([await fs.readFile(parquetFile)]),
          },
          {
            path: 'config.yml',
            content: new Blob([await fs.readFile(configPath)]),
          },
        ],
      });
    } catch (error) {
      throw Error('Error uploading files: ' + error);
    }

    return repoId;
  });

async function createDatasetConfig(dataset: Dataset): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));

  const configPath = path.join(tempDir, 'config.yml');
  const config = await generateDatasetConfig(dataset);
  await fs.writeFile(configPath, yaml.stringify(config));

  return configPath;
}
async function readmeContent(dataset: Dataset): Promise<string> {
  return `
---
pretty_name: ${dataset.name}

tags:
- aisheets
- synthetic data

${yaml.stringify({
  dataset_info: {
    features: await generateFeaturesInfo(dataset),
  },
})}
  
configs:
- config_name: default
  data_files:
  - split: train
    path: data/train*
---
`;
}

const mapDBTypeToFeatureType = (dbType: string) => {
  const type = dbType.toLowerCase();

  switch (type) {
    case 'varchar':
    case 'string':
    case 'text':
      return 'string';

    case 'blob':
      return 'binary';

    default:
      return type;
  }
};

const generateFeaturesInfo = async (dataset: Dataset) => {
  const dbColumns = await describeTableColumns(dataset);

  return dataset.columns.map((column) => {
    const type = column.type.trim().toLowerCase();
    if (type === 'image') {
      return {
        name: column.name,
        dtype: type,
      };
    }

    const dbCol = dbColumns.find((col) => col.name === column.id);
    if (!dbCol) {
      return {
        name: column.name,
        dtype: 'string',
      };
    }

    if (dbCol.properties && dbCol.properties.length > 0) {
      return {
        name: column.name,
        [mapDBTypeToFeatureType(dbCol.type)]: dbCol.properties.map((prop) => ({
          name: prop.name,
          dtype: mapDBTypeToFeatureType(prop.type),
        })),
      };
    }

    return {
      name: column.name,
      dtype: mapDBTypeToFeatureType(dbCol.type),
    };
  });
};
