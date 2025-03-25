import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { createDatasetIdByUser } from '~/services';
import { type Dataset, serverSession } from '~/state';

export const useCreateNewBlankDataset = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    accessToken: string,
  ): Promise<Dataset> {
    const session = await serverSession(accessToken);

    const dataset = await createDatasetIdByUser({
      createdBy: session.username,
    });

    return dataset;
  });
