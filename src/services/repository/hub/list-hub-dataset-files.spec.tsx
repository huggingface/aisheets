import { describe, expect, it } from 'vitest';

import { listHubDatasetDataFiles } from './list-hub-dataset-files';

const accessToken = process.env.HF_TOKEN;

describe.runIf(accessToken)('listHubDatasetFiles', () => {
  it('should list files in a public hub dataset', async () => {
    const files = await listHubDatasetDataFiles({
      repoId: 'open-thoughts/OpenThoughts-114k',
      accessToken: accessToken!,
    });

    expect(files).toEqual([
      'data/train-00000-of-00006.parquet',
      'data/train-00001-of-00006.parquet',
      'data/train-00002-of-00006.parquet',
      'data/train-00003-of-00006.parquet',
      'data/train-00004-of-00006.parquet',
      'data/train-00005-of-00006.parquet',
      'metadata/train-00000-of-00012.parquet',
      'metadata/train-00001-of-00012.parquet',
      'metadata/train-00002-of-00012.parquet',
      'metadata/train-00003-of-00012.parquet',
      'metadata/train-00004-of-00012.parquet',
      'metadata/train-00005-of-00012.parquet',
      'metadata/train-00006-of-00012.parquet',
      'metadata/train-00007-of-00012.parquet',
      'metadata/train-00008-of-00012.parquet',
      'metadata/train-00009-of-00012.parquet',
      'metadata/train-00010-of-00012.parquet',
      'metadata/train-00011-of-00012.parquet',
    ]);
  });

  it('should list files in a private hub dataset', async () => {
    const files = await listHubDatasetDataFiles({
      repoId:
        'argilla-internal-testing/test_import_dataset_from_hub_with_classlabel_fab700c3-3db4-4b6d-b9ce-39a75ffa93d1',
      accessToken: accessToken!,
    });

    expect(files).toEqual(['data/train-00000-of-00001.parquet']);
  });

  it('should list csv files', async () => {
    const files = await listHubDatasetDataFiles({
      repoId: 'Anthropic/EconomicIndex',
      accessToken: accessToken!,
    });

    expect(files).toEqual([
      'SOC_Structure.csv',
      'automation_vs_augmentation.csv',
      'bls_employment_may_2023.csv',
      'onet_task_mappings.csv',
      'onet_task_statements.csv',
      'wage_data.csv',
    ]);
  });

  it('should list jsonl files', async () => {
    const files = await listHubDatasetDataFiles({
      repoId: 'Congliu/Chinese-DeepSeek-R1-Distill-data-110k',
      accessToken: accessToken!,
    });

    expect(files).toEqual(['distill_r1_110k.jsonl']);
  });

  it('should raises an error if the repo does not exist', async () => {
    await expect(
      listHubDatasetDataFiles({
        repoId: 'open-thoughts/does-not-exist',
        accessToken: accessToken!,
      }),
    ).rejects.toThrowError('Repository not found');
  });
});
