import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { type Dataset, useServerSession } from '~/state';
import { generateDatasetConfig } from './create-dataset-config';
import { augmentDatasetJob } from './jobs/jobs';

export const useRunAugmentDatasetJob = () => {
  return server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    params: {
      source: {
        repoId: string;
        split?: 'train';
        config?: 'default';
      };
      target: {
        repoId: string;
        split?: 'train';
        config?: 'default';
      };
      dataset: Dataset;
    },
  ): Promise<string> {
    const session = useServerSession(this);

    const config = await generateDatasetConfig(params.dataset);

    return await augmentDatasetJob({
      ...params,
      config,
      accessToken: session.token,
    });
  });
};
