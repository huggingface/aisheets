import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import yaml from 'yaml';

import { DuckDBInstance } from '@duckdb/node-api';

import { type HubApiError, createRepo, uploadFiles } from '@huggingface/hub';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { getRowCells } from '~/services';
import { getDatasetById, listDatasetRows } from '~/services/repository';
import { type Dataset, type Process, useServerSession } from '~/state';
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
            content: url.pathToFileURL(filePath),
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
      const hasReferredColumns =
        column.process.columnsReferences &&
        column.process.columnsReferences.length > 0;

      // Get validated examples for this column
      const validatedCells = column.cells.filter((cell) => cell.validated);
      const examples = await Promise.all(
        validatedCells.map(async (cell) => {
          if (hasReferredColumns) {
            // Get referenced column values for this row
            const rowCells = await getRowCells({
              rowIdx: cell.idx,
              columns: column.process!.columnsReferences!,
            });

            const inputs = Object.fromEntries(
              rowCells
                .filter((rcell): rcell is typeof rcell & { value: string } =>
                  Boolean(rcell.column?.name && rcell.value),
                )
                .map((rcell) => [rcell.column!.name, rcell.value]),
            );

            return { output: cell.value || '', inputs };
          }
          return { output: cell.value || '', inputs: {} };
        }),
      );

      // Get data from the first row with referenced columns (for materialization)
      let data = {};
      if (hasReferredColumns) {
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
        userPrompt: column.process.prompt, // Store original prompt
        prompt: materializePrompt({
          // Store materialized prompt
          instruction: column.process.prompt,
          examples: examples.length > 0 ? examples : undefined,
          data: Object.keys(data).length > 0 ? data : undefined,
        }),
        columnsReferences: column.process.columnsReferences,
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
