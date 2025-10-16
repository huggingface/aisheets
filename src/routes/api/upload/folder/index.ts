import type { RequestHandler } from '@builder.io/qwik-city';
import { appConfig } from '~/config';
import { createColumn } from '~/services/repository/columns';
import { createDataset } from '~/services/repository/datasets';
import { upsertColumnValues } from '~/services/repository/tables/insert-column-values';
import { useServerSession } from '~/state';

export const onPost: RequestHandler = async (event) => {
  const { request, json } = event;
  const numberOfRows = appConfig.data.maxRowsImport;
  console.log('Max rows allowed for import:', numberOfRows);

  try {
    const session = useServerSession(event);
    console.log('User session:', session);
    const formData = await request.formData();
    console.log('Received form data:', formData);

    const folderName = (formData.get('folderName') as string) || 'Image Folder';
    console.log('Folder name:', folderName);
    const fileCount = parseInt(formData.get('fileCount') as string, 10) || 0;
    console.log('Number of files to process:', fileCount);

    if (fileCount === 0) {
      json(400, { error: 'No files provided' });
      return;
    }
    console.log('Creating dataset for folder upload...');

    const dataset = await createDataset({
      name: folderName,
      createdBy: session.user.username,
    });

    console.log('Dataset created with ID:', dataset.id);

    const imageColumn = await createColumn({
      name: 'image',
      type: 'image',
      kind: 'static',
      dataset,
    });

    console.log('Image column created with ID:', imageColumn.id);

    const filenameColumn = await createColumn({
      name: 'filename',
      type: 'text',
      kind: 'static',
      dataset,
    });

    console.log('Filename column created with ID:', filenameColumn.id);

    const imageData: [number, Uint8Array][] = [];
    const filenameData: [number, string][] = [];

    for (let i = 0; i < Math.min(fileCount, numberOfRows); i++) {
      const file = formData.get(`file_${i}`) as File;
      if (!file) continue;

      const arrayBuffer = await file.arrayBuffer();
      const binaryData = new Uint8Array(arrayBuffer);

      imageData.push([i, binaryData]);
      filenameData.push([i, file.name]);
    }

    console.log(`Prepared data for ${imageData.length} images.`);

    await upsertColumnValues({
      dataset,
      column: {
        id: imageColumn.id,
        name: imageColumn.name,
        type: imageColumn.type,
      },
      values: imageData,
    });

    console.log('Image data inserted.');

    await upsertColumnValues({
      dataset,
      column: {
        id: filenameColumn.id,
        name: filenameColumn.name,
        type: filenameColumn.type,
      },
      values: filenameData,
    });

    console.log('Filename data inserted.');

    json(201, {
      id: dataset.id,
      name: dataset.name,
      createdBy: dataset.createdBy,
      columns: [imageColumn, filenameColumn],
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
      size: imageData.length,
    });
  } catch (error) {
    console.error('Error uploading folder:', error);
    json(500, { error: 'Failed to upload folder' });
  }
};
