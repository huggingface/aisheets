import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'yaml';

import { type HubApiError, createRepo, uploadFiles } from '@huggingface/hub';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getDatasetById } from '~/services/repository/datasets';
import { exportDatasetTableRows } from '~/services/repository/tables';
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

    const readme = readmeContent(foundDataset);

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
function readmeContent(dataset: Dataset): string {
  return `
---
pretty_name: ${dataset.name}
tags:
- aisheets
- synthetic data

${yaml.stringify({
  dataset_info: {
    features: generateFeaturesInfo(dataset.columns),
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

const generateFeaturesInfo = (
  columns: { id: string; name: string; type: string }[],
) => {
  return columns.map((column) => {
    switch (column.type.toLowerCase()) {
      case 'image': {
        return {
          name: column.name,
          dtype: 'image',
        };
      }
      default: {
        return {
          name: column.name,
          dtype: 'string',
        };
      }
    }
  });
};
