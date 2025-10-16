import type { RequestHandler } from '@builder.io/qwik-city';
import JSZip from 'jszip';
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

    const folderName = request.headers.get('X-Folder-Name') || 'images';
    const fileCount = parseInt(
      request.headers.get('X-Images-Count') || '0',
      10,
    );

    if (fileCount === 0) {
      json(400, { error: 'No files provided' });
      return;
    }

    const imageData: [number, Uint8Array][] = [];
    const filenameData: [number, string][] = [];

    const zipData = await request.arrayBuffer();
    const zip = await JSZip.loadAsync(zipData);

    if (!zip) {
      json(400, { error: 'No data provided' });
      return;
    }

    let index = 0;
    for (const [filename, fileObj] of Object.entries(zip.files)) {
      if (index >= Math.min(fileCount, numberOfRows)) break;
      if (fileObj.dir) continue; // skip directories

      const fileData = await fileObj.async('uint8array');
      imageData.push([index, fileData]);
      filenameData.push([index, filename]);
      index++;
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

    const filenameColumn = await createColumn({
      name: 'filename',
      type: 'text',
      kind: 'static',
      dataset,
    });

    await upsertColumnValues({
      dataset,
      column: {
        id: imageColumn.id,
        name: imageColumn.name,
        type: imageColumn.type,
      },
      values: imageData,
    });

    await upsertColumnValues({
      dataset,
      column: {
        id: filenameColumn.id,
        name: filenameColumn.name,
        type: filenameColumn.type,
      },
      values: filenameData,
    });

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
    json(500, { error: 'Failed to upload images' });
  }
};
