import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

import { DuckDBInstance } from '@duckdb/node-api';

import { type HubApiError, createRepo, uploadFiles } from '@huggingface/hub';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { getDatasetById, listDatasetRows } from '~/services/repository';
import { type Dataset, useServerSession } from '~/state';

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
    const { dataset, name } = exportParams;
    const session = useServerSession(this);
    // TODO: This line is needed because the incoming dataset has no columns. cc @damianpumar
    const foundDataset = await getDatasetById(dataset.id);

    if (!foundDataset) {
      throw new Error('Dataset not found');
    }

    const filePath = await exportDatasetToParquet(foundDataset);

    const owner = session.user.username;
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
        ],
      });
    } catch (error) {
      throw Error('Error uploading files: ' + error);
    }

    return repoId;
  });

async function exportDatasetToParquet(foundDataset: Dataset): Promise<string> {
  const jsonl = [];
  for await (const row of listDatasetRows({ dataset: foundDataset })) {
    jsonl.push(JSON.stringify(row));
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));
  const filePath = `${tempDir}/file.jsonl`;
  const parquetFielpath = `${tempDir}/file.parquet`;

  await fs.writeFile(filePath, jsonl.join('\n'));
  // TODO: We can clearly improve this by avoiding the creation of an intermediate file
  // Anyway the first step is to generate the parquet file from the dataset. cc @dvsuero
  const instance = await DuckDBInstance.create(':memory:');
  const connect = await instance.connect();
  try {
    await connect.run(
      `CREATE TABLE tbl AS SELECT * FROM read_json_auto('${filePath}')`,
    );
    await connect.run(`COPY tbl TO '${parquetFielpath}' (FORMAT PARQUET)`);
  } catch (error) {
    throw new Error('Error exporting dataset to parquet: ' + error);
  } finally {
    await connect.close();
  }

  return parquetFielpath;
}
