import child_process from 'node:child_process';
import { promisify } from 'node:util';

import type { DatasetConfig } from '../create-dataset-config';

const exec = promisify(child_process.exec);

export const augmentDatasetJob = async ({
  source,
  target,
  config,
  accessToken,
}: {
  source: {
    repoId: string;
    split?: string;
    config?: string;
  };
  target: {
    repoId: string;
    split?: string;
    config?: string;
  };
  config: DatasetConfig;
  accessToken: string;
}): Promise<string> => {
  const jobScriptURL =
    //  'https://github.com/huggingface/aisheets/raw/refs/heads/main/scripts/extend_dataset/with_inference_client.py';
    'https://raw.githubusercontent.com/huggingface/aisheets/refs/heads/feat/running-generation-as-jobs/scripts/extend_dataset/with_inference_client_v2.py';

  if (!source.repoId) {
    throw new Error('Source repoId is required to run the job');
  }
  if (!target.repoId) {
    throw new Error('Target repoId is required to run the job');
  }
  if (!config) throw new Error('Config is required to run the job');

  const configJson = JSON.stringify(config);
  const jobCommand = `
    ${jobScriptURL} ${source.repoId} ${target.repoId} \
    --split ${source.split ?? 'train'} \
    --destination-split ${target.split ?? 'train'} \
    --config-json '${configJson}'
  `.trim();

  try {
    const secrets: Record<string, string> = {
      HF_TOKEN: accessToken,
    };

    return runHfJobCommand(jobCommand, {
      flavor: 'cpu-basic',
      accessToken,
      secrets,
    });
  } catch (e) {
    console.error('Unexpected error running job:', e);
    throw e;
  }
};

const runHfJobCommand = async (
  command: string,
  options: {
    flavor?: string;
    accessToken: string;
    timeout?: string;
    secrets?: Record<string, string>;
  },
) => {
  const { accessToken, flavor = 'l4x1', timeout = '12h' } = options;

  if (!accessToken) throw new Error('Access token is required to run the job');

  let hfJobsCommand = `
    HF_HUB_DISABLE_EXPERIMENTAL_WARNING=1 \
    hf jobs uv run \
    --detach \
    --flavor ${flavor} \
    --timeout ${timeout} \
    --token ${accessToken} \
  `;

  for (const [key, value] of Object.entries(options.secrets ?? {})) {
    hfJobsCommand = hfJobsCommand.concat(` --secrets ${key}='${value}'`);
  }

  hfJobsCommand = hfJobsCommand.concat(` ${command}`).trim();

  console.log('Running job command:', hfJobsCommand);
  const { stdout, stderr } = await exec(hfJobsCommand);

  if (stderr) throw new Error(`Job failed: ${stderr}`);

  const jobURL = stdout.match(/View at:\s+(https?:\/\/[^\s]+)/)?.[1];
  const jobIdMatch = stdout.match(/Job started with ID:\s+([a-f0-9]+)/);

  if (!jobIdMatch && !jobURL) {
    return (
      'Job started, but could not parse job ID or URL from output: ' + stdout
    );
  }

  const jobId = jobIdMatch ? jobIdMatch[1] : null;

  console.log('Job started with ID:', jobId);
  console.log('View job at:', jobURL);

  return jobURL!;
};
