import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { importDatasetFromFile } from '~/services/repository/datasets';
import { type Dataset, useServerSession } from '~/state';

export const useImportFromURL = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    {
      url,
      name,
      secretToken,
    }: {
      url: string;
      name: string;
      secretToken?: string;
    },
  ): Promise<Dataset> {
    const session = useServerSession(this);

    return await importDatasetFromFile(
      {
        name: name,
        createdBy: session.user.username,
        file: url,
      },
      {
        limit: 1000,
        secrets: {
          googleSheets: secretToken,
        },
      },
    );
  });
