import { createWriteStream, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import type { RequestHandler } from '@builder.io/qwik-city';
import { appConfig } from '~/config';
import { importDatasetFromFile } from '~/services/repository/datasets';
import { useServerSession } from '~/state';

export const onPost: RequestHandler = async (event) => {
  const { request, json } = event;
  const numberOfRows = appConfig.data.maxRowsImport;
  let filePath: string | undefined;

  try {
    const session = useServerSession(event);
    const filename = decodeURIComponent(request.headers.get('X-File-Name')!);

    filePath = await writeRequestFileLocally(request, filename);

    const newDataset = await importDatasetFromFile(
      {
        name: filename,
        createdBy: session.user.username,
        file: filePath,
      },
      {
        limit: numberOfRows,
      },
    );

    json(201, newDataset);
  } catch (error) {
    console.error('Error uploading file:', error);
    json(500, { error: 'Failed to upload file' });
  } finally {
    // Clean up the file after processing
    if (filePath) await deleteFile(filePath);
  }
};

const writeRequestFileLocally = async (
  request: Request,
  filename: string,
): Promise<string> => {
  const chunk = await request.arrayBuffer();

  const {
    data: { dataDir },
  } = appConfig;

  const chunksDir = join(dataDir, '/uploads/files');
  mkdirSync(chunksDir, { recursive: true });

  const filePath = join(chunksDir, crypto.randomUUID()) + filename;
  const writeStream = createWriteStream(filePath, { flags: 'a' });

  writeStream.write(Buffer.from(chunk));
  writeStream.end();

  return filePath;
};

const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};
