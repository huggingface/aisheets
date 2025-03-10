import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { type Dataset, useServerSession } from '~/state';

import consola from 'consola';
import { importDatasetFromFile } from '~/services/repository/datasets';
import { describeFromURI } from '~/services/repository/hub';
import { downloadDatasetFile } from '~/services/repository/hub/download-file';

export interface ImportFromHubParams {
  repoId: string;
  filePath: string;
}

export const useImportFromHub = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    importParams: ImportFromHubParams,
  ): Promise<Dataset> {
    const { repoId, filePath } = importParams;
    const session = useServerSession(this);

    consola.info('Downloading file', repoId, filePath);
    const downloadedFilePath = await downloadDatasetFile({
      repoId,
      file: filePath,
      accessToken: session.token,
    });

    const fileInfo = await describeFromURI({
      uri: downloadedFilePath,
    });

    const totalRows = fileInfo.numberOfRows;
    consola.info(`Importing ${totalRows} rows from ${filePath}`);

    return await importDatasetFromFile(
      {
        name: `${repoId} [${filePath}]`,
        createdBy: session.user.username,
        file: downloadedFilePath,
      },
      {
        limit: 1000,
      },
    );
  });
