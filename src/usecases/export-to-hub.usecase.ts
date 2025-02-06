import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

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
  ) {
    const { dataset, name } = exportParams;
    const session = useServerSession(this);
    // TODO: This line is needed because the incoming dataset has no columns. cc @damianpumar
    const foundDataset = await getDatasetById(dataset.id);

    if (!foundDataset) {
      throw new Error('Dataset not found');
    }

    const jsonl = [];
    for await (const row of listDatasetRows({ dataset: foundDataset })) {
      jsonl.push(JSON.stringify(row));
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));
    const filePath = `${tempDir}/file.jsonl`;

    await fs.writeFile(filePath, jsonl.join('\n'));

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
            path: 'train.jsonl',
            content: url.pathToFileURL(filePath),
          },
        ],
      });
    } catch (error) {
      throw Error('Error uploading files: ' + error);
    }
  });
