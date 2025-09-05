import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'yaml';

import { type HubApiError, createRepo, uploadFiles } from '@huggingface/hub';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getDatasetById } from '~/services/repository/datasets';
import {
  exportDatasetTableRows,
  listDatasetTableRows,
} from '~/services/repository/tables';
import { describeTableColumns } from '~/services/repository/tables/describe-table-columns';
import { type Dataset, useServerSession } from '~/state';
import { generateDatasetConfig } from './create-dataset-config';
import { detectMimeTypeFromBytes } from './utils/mime-types';

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

  if (type.startsWith('timestamp')) {
    const precision = type.split('_')[1];
    return `timestamp[${precision || 's'}]`;
  }

  switch (type) {
    case 'varchar':
    case 'string':
    case 'text':
      return 'string';

    case 'blob':
      return 'binary';

    case 'bigint':
    case 'int':
    case 'integer':
    case 'smallint':
    case 'tinyint':
    case 'mediumint':
      return 'int64';

    case 'float':
    case 'double':
    case 'real':
    case 'decimal':
      return 'float64';

    default:
      return type;
  }
};

const generateFeaturesInfo = async (dataset: Dataset) => {
  const dbColumns = await describeTableColumns(dataset);

  const features = dataset.columns.map(async (column) => {
    const type = column.type.trim().toLowerCase();
    const dbCol = dbColumns.find((col) => col.name === column.id);
    // Fallback to string if column not found in the database
    if (!dbCol) {
      return {
        name: column.name,
        dtype: 'string',
      };
    }
    // Image column
    if (type === 'image' || (await isImageFeature(dataset, dbCol))) {
      return {
        name: column.name,
        dtype: 'image',
      };
    }
    // Nested column (struct, map or list of struct)
    if (dbCol.properties && dbCol.properties.length > 0) {
      return {
        name: column.name,
        [mapDBTypeToFeatureType(dbCol.type)]: dbCol.properties.map((prop) => ({
          name: prop.name,
          dtype: mapDBTypeToFeatureType(prop.type),
        })),
      };
    }
    // List column (list of int, list of string, list of float, etc)
    if (dbCol.itemsType) {
      return {
        name: column.name,
        [mapDBTypeToFeatureType(dbCol.type)]: mapDBTypeToFeatureType(
          dbCol.itemsType,
        ),
      };
    }
    // Primitive column (int, string, float, etc)
    return {
      name: column.name,
      dtype: mapDBTypeToFeatureType(dbCol.type),
    };
  });

  return Promise.all(features);
};

const isImageFeature = async (
  dataset: Dataset,
  dbCol: {
    name: string;
    type: string;
    properties?: Array<{ name: string; type: string }>;
  },
) => {
  let blobProp:
    | {
        name: string;
        type: string;
        properties?: Array<{
          name: string;
          type: string;
        }>;
      }
    | undefined;
  if (dbCol.type.toLowerCase() === 'blob') {
    blobProp = dbCol;
  } else if (dbCol.properties) {
    blobProp = dbCol.properties.find(
      (prop) => prop.type.toLowerCase() === 'blob',
    );
  }

  if (blobProp) {
    const columnMimeType = await extractDatasetColumnMimeType({
      dataset,
      columnId: dbCol.name,
    });

    return columnMimeType?.startsWith('image/');
  }

  return false;
};

const extractDatasetColumnMimeType = async ({
  dataset,
  columnId,
}: {
  dataset: Dataset;
  columnId: string;
}): Promise<string | null> => {
  try {
    const row = await listDatasetTableRows({
      dataset,
      columns: [{ id: columnId }],
      offset: 0,
      limit: 1,
    });

    if (row.length === 0) return null;

    const value = row[0][columnId];

    if (value instanceof Uint8Array) {
      return detectMimeTypeFromBytes(value);
    }
    if ('bytes' in value && value.bytes instanceof Uint8Array) {
      return detectMimeTypeFromBytes(value.bytes);
    }
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (first instanceof Uint8Array) {
        return detectMimeTypeFromBytes(first);
      }
      if (first && 'bytes' in first && first.bytes instanceof Uint8Array) {
        return detectMimeTypeFromBytes(first.bytes);
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting mime type:', error);
    return null;
  }
};
