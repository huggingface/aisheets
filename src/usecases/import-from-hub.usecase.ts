import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import type { HubApiError } from '@huggingface/hub';
import consola from 'consola';
import { appConfig } from '~/config';
import { importDatasetFromFile } from '~/services/repository/datasets';
import { describeFromURI } from '~/services/repository/hub';
import { downloadDatasetFile } from '~/services/repository/hub/download-file';
import { useServerSession } from '~/state';

export interface ImportFromHubParams {
  repoId: string;
  filePath: string;
}
export interface ImportFromHubResult {
  dataset?: {
    id: string;
    name: string;
  };

  error?: string;
}

export const useImportFromHub = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    importParams: ImportFromHubParams,
  ): Promise<ImportFromHubResult> {
    const { repoId, filePath } = importParams;
    const session = useServerSession(this);

    const numberOfRows = appConfig.data.maxRowsImport;

    consola.info('Downloading file', repoId, filePath);
    try {
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

      const dataset = await importDatasetFromFile(
        {
          name: `${repoId} [${filePath}]`,
          createdBy: session.user.username,
          file: downloadedFilePath,
        },
        {
          limit: numberOfRows,
        },
      );

      return { dataset };
    } catch (error) {
      consola.error('Error downloading file', error);

      return {
        error: `${(error as HubApiError).data?.error || (error as Error).message}`,
      };
    }
  });
