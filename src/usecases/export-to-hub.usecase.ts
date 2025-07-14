import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'yaml';

import { type HubApiError, createRepo, uploadFiles } from '@huggingface/hub';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnCellByIdx, getRowCells } from '~/services/repository/cells';
import { getDatasetById } from '~/services/repository/datasets';
import { exportDatasetTableRows } from '~/services/repository/tables';
import {
  type Cell,
  type Column,
  type Dataset,
  useServerSession,
} from '~/state';
import { materializePrompt } from '../services/inference/materialize-prompt';
import { collectValidatedExamples } from './collect-examples';

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

async function generateDatasetConfig(dataset: Dataset): Promise<
  Record<
    string,
    {
      modelName?: string;
      modelProvider?: string;
      userPrompt?: string;
      prompt?: string;
      searchEnabled?: boolean;
      columnsReferences?: string[];
    }
  >
> {
  const columnConfigs: Record<string, any> = {};

  for (const column of dataset.columns) {
    if (!column.process) continue;

    // Skip columns with empty model configuration
    if (
      !column.process.modelName &&
      !column.process.modelProvider &&
      !column.process.prompt
    ) {
      continue;
    }

    const prompt = await promptTemplateForColumn(column);

    columnConfigs[column.name] = {
      modelName: column.process.modelName,
      modelProvider: column.process.modelProvider,
      userPrompt: column.process.prompt,
      prompt,
      searchEnabled: column.process.searchEnabled,
      columnsReferences: column.process.columnsReferences?.map((colId) => {
        const refColumn = dataset.columns.find((c) => c.id === colId);
        return refColumn?.name || colId;
      }),
    };
  }

  return columnConfigs;
}

async function getFirstRowData(columnsReferences: string[]) {
  const firstRowCells = await getRowCells({
    rowIdx: 0,
    columns: columnsReferences,
  });
  return Object.fromEntries(
    firstRowCells.map((cell) => [cell.column!.name, cell.value]),
  );
}

async function createDatasetConfig(dataset: Dataset): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));

  const configPath = path.join(tempDir, 'config.yml');
  const columnConfigs = await generateDatasetConfig(dataset);
  await fs.writeFile(configPath, yaml.stringify({ columns: columnConfigs }));

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

const promptTemplateForColumn = async (
  column: Column,
): Promise<string | undefined> => {
  const { process } = column;
  if (!process || !process.prompt) return undefined;

  if (column.type === 'image') {
    return undefined; // Image columns do not have prompt templates
  }

  // Fetch complete cell data for validated cells
  const validatedCells = await Promise.all(
    column.cells
      .filter((cell) => cell.validated)
      .map((cell) =>
        getColumnCellByIdx({
          idx: cell.idx,
          columnId: column.id,
        }),
      ),
  );

  const examples = await collectValidatedExamples({
    validatedCells: validatedCells.filter(
      (cell): cell is Cell => cell !== null,
    ),
    columnsReferences: process.columnsReferences,
  });

  // Get data for prompt materialization
  const data: any | undefined = process.columnsReferences?.length
    ? await getFirstRowData(process.columnsReferences)
    : {};

  // Replace each value in data with its key wrapped in {{}}
  for (const key of Object.keys(data)) {
    data[key] = `{{${key}}}`;
  }

  return materializePrompt({
    instruction: process.prompt,
    data: data ?? undefined,
    examples: examples?.length ? examples : undefined,
  });
};
