import type { RequestHandler } from '@builder.io/qwik-city';
import { appConfig } from '~/config';
import { createColumn } from '~/services/repository/columns';
import { createDataset } from '~/services/repository/datasets';
import { upsertColumnValues } from '~/services/repository/tables/insert-column-values';
import { useServerSession } from '~/state';

export const onPost: RequestHandler = async (event) => {
  const { request, json } = event;
  const numberOfRows = appConfig.data.maxRowsImport;

  try {
    const session = useServerSession(event);
    const formData = await request.formData();

    const folderName = (formData.get('folderName') as string) || 'Image Folder';
    const fileCount = parseInt(formData.get('fileCount') as string, 10) || 0;

    if (fileCount === 0) {
      json(400, { error: 'No files provided' });
      return;
    }

    const dataset = await createDataset({
      name: folderName,
      createdBy: session.user.username,
    });

    const imageColumn = await createColumn({
      name: 'image',
      type: 'image',
      kind: 'static',
      dataset,
    });

    const imageData: [number, Uint8Array][] = [];

    for (let i = 0; i < Math.min(fileCount, numberOfRows); i++) {
      const file = formData.get(`file_${i}`) as File;
      if (!file) continue;

      const arrayBuffer = await file.arrayBuffer();
      const binaryData = new Uint8Array(arrayBuffer);

      imageData.push([i, binaryData]);
    }

    await upsertColumnValues({
      dataset,
      column: {
        id: imageColumn.id,
        name: imageColumn.name,
        type: imageColumn.type,
      },
      values: imageData,
    });

    json(201, {
      id: dataset.id,
      name: dataset.name,
      createdBy: dataset.createdBy,
      columns: [imageColumn],
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
      size: imageData.length,
    });
  } catch (error) {
    console.error('Error uploading folder:', error);
    json(500, { error: 'Failed to upload folder' });
  }
};
