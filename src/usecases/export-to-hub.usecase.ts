import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { spawn } from 'node:child_process';

import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import consola from 'consola';
import { getDatasetById, listDatasetRows } from '~/services/repository';
import { type Dataset, useServerSession } from '~/state';

export interface ExportDatasetParams {
  dataset: Dataset;
  owner?: string;
  name: string;
  private: boolean;
}

const runExport2HubPythonScript = async (params: string[]): Promise<void> => {
  const pythonProcess = spawn('python', [
    'scripts/push_dataset_to_hub.py',
    ...params,
  ]);

  pythonProcess.stderr.on('data', (data) => {
    if (data) consola.error(`stderr: ${data}`);
  });

  pythonProcess.stdout.on('data', (data) => {
    if (data) consola.log(`stdout: ${data}`);
  });

  const promise = new Promise<void>((resolve, reject) => {
    pythonProcess.on('close', (code) => {
      if (code !== 0) reject(new Error(`Export failed : ${code}`));
      else resolve();
    });
  });

  return promise;
};

export const useExportDataset = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    exportParams: ExportDatasetParams,
  ) {
    const { dataset, name, owner } = exportParams;
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

    const params = [
      '--path',
      filePath,
      '--dataset-name',
      name,
      '--dataset-owner',
      owner ?? session.user.name,
      '--auth-token',
      session.token,
    ];

    if (exportParams.private) {
      params.push('--private');
    } else {
      params.push('--no-private');
    }

    await runExport2HubPythonScript(params);
  });
