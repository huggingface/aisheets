import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { google } from 'googleapis';
import { importDatasetFromFile } from '~/services/repository/datasets';
import { type Dataset, useServerSession } from '~/state';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GOOGLE_CLIENT_ID } from '~/config';

import { default as papa } from 'papaparse';

const readSpreadsheetContent = async (
  url: string,
  token: string,
): Promise<{
  filePath: string;
  name: string;
}> => {
  const spreadsheetId = url.split('/d/')[1].split('/')[0];
  const sheetId = url.split('#gid=')[1] || '0'; // Default to gid 0 if not specified

  // Create an OAuth2 client with the provided token
  const oauth2Client = new google.auth.OAuth2({
    clientId: GOOGLE_CLIENT_ID,
  });

  oauth2Client.setCredentials({
    access_token: token,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  });

  const service = google.sheets({
    version: 'v4',
    auth: oauth2Client,
  });

  try {
    const res = await service.spreadsheets.get({ spreadsheetId });

    const spreadSheetTitle =
      res.data.properties?.title || 'Untitled Spreadsheet';

    let requestedSheet: any | undefined;
    for (const sheet of res.data.sheets || []) {
      if (sheet.properties?.sheetId === Number(sheetId)) {
        requestedSheet = sheet;
        break;
      }
    }
    if (requestedSheet === undefined) {
      throw new Error(`Sheet with ID ${sheetId} not found in the spreadsheet.`);
    }

    // Fetch the rows from the specified sheet
    const response = await service.spreadsheets.values.get({
      spreadsheetId,
      range: `${requestedSheet.properties.title}!A1:Z`,
    });

    const data = response.data.values;

    if (!data || data.length === 0) {
      throw new Error('No data found in the sheet.');
    }

    const csv = papa.unparse(data, {
      header: true,
      quotes: true,
      skipEmptyLines: true,
      quoteChar: '"',
      delimiter: ',',
      escapeChar: '\\',
    });

    const filePath = path.join(
      os.tmpdir(),
      `sheet-${spreadsheetId}-${sheetId}.csv`,
    );
    fs.writeFileSync(filePath, csv);

    return {
      filePath,
      name: `${spreadSheetTitle} - ${requestedSheet.properties.title}`,
    };
  } catch (error) {
    console.error('Error initializing Google Drive API:', error);
    throw new Error('Failed to initialize Google Drive API');
  }
};

export const useImportFromGoogle = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    {
      url,
      secretToken,
    }: {
      url: string;
      secretToken: string;
    },
  ): Promise<Dataset> {
    const session = useServerSession(this);

    const { filePath, name } = await readSpreadsheetContent(url, secretToken);

    return await importDatasetFromFile(
      {
        name: name,
        createdBy: session.user.username,
        file: filePath,
      },
      {
        limit: 1000,
      },
    );
  });
