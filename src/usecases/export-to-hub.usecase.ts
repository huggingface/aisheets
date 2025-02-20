import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'yaml';

import { DuckDBInstance } from '@duckdb/node-api';

import { type HubApiError, createRepo, uploadFiles } from '@huggingface/hub';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getRowCells } from '~/services/repository/cells';
import {
  getDatasetById,
  listDatasetRows,
} from '~/services/repository/datasets';
import { type Dataset, type Process, useServerSession } from '~/state';
import { collectExamples } from './collect-examples';
import { materializePrompt } from './materialize-prompt';

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

    const filePath = await exportDatasetToParquet(foundDataset);

    const owner = requestedOwner || session.user.username;
    const repoId = `${owner}/${name}`;

    try {
      await createRepo({
        repo: { type: 'dataset', name: repoId },
        private: exportParams.private,
        accessToken: session.token,
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
            path: 'train.parquet',
            content: new Blob([
              await fs.readFile(path.join(filePath, 'file.parquet')),
            ]),
          },
          {
            path: 'config.yml',
            content: new Blob([
              await fs.readFile(path.join(filePath, 'config.yml')),
            ]),
          },
        ],
      });
    } catch (error) {
      throw Error('Error uploading files: ' + error);
    }

    return repoId;
  });

async function exportDatasetToParquet(foundDataset: Dataset): Promise<string> {
  const jsonl = [];
  const columnConfigs: Record<string, Process & { userPrompt: string }> = {};

  // Collect process configurations from columns
  for (const column of foundDataset.columns) {
    if (column.process) {
      const examples = await collectExamples({
        column,
        validatedCells: column.cells.filter((cell) => cell.validated),
        columnsReferences: column.process.columnsReferences,
      });

      // Get data from first row for materialization
      let data = {};
      if (column.process.columnsReferences?.length) {
        const firstRowCells = await getRowCells({
          rowIdx: 0,
          columns: column.process.columnsReferences,
        });
        data = Object.fromEntries(
          firstRowCells.map((cell) => [cell.column!.name, cell.value]),
        );
      }

      columnConfigs[column.name] = {
        modelName: column.process.modelName,
        modelProvider: column.process.modelProvider,
        userPrompt: column.process.prompt,
        prompt: materializePrompt({
          instruction: column.process.prompt,
          examples: examples.length > 0 ? examples : undefined,
          data: Object.keys(data).length > 0 ? data : undefined,
        }),
        columnsReferences: column.process.columnsReferences?.map((colId) => {
          const refColumn = foundDataset.columns.find((c) => c.id === colId);
          return refColumn?.name || colId;
        }),
        offset: column.process.offset,
        limit: column.process.limit,
      };
    }
  }

  // Collect data rows
  for await (const row of listDatasetRows({ dataset: foundDataset })) {
    jsonl.push(JSON.stringify(row));
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));
  const filePath = `${tempDir}/file.jsonl`;
  const parquetFilepath = `${tempDir}/file.parquet`;
  const configFilepath = `${tempDir}/config.yml`;

  // Write the YAML configuration file
  const yamlContent = yaml.stringify({ columns: columnConfigs });
  await fs.writeFile(configFilepath, yamlContent);

  await fs.writeFile(filePath, jsonl.join('\n'));
  const instance = await DuckDBInstance.create(':memory:');
  const connect = await instance.connect();
  try {
    await connect.run(
      `CREATE TABLE tbl AS SELECT * FROM read_json_auto('${filePath}')`,
    );
    await connect.run(`COPY tbl TO '${parquetFilepath}' (FORMAT PARQUET)`);
  } catch (error) {
    throw new Error('Error exporting dataset to parquet: ' + error);
  } finally {
    await connect.close();
  }

  return tempDir;
}
