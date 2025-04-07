import { $, component$, useComputed$, useSignal } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { LuChevronRightSquare } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { userServerConfig } from '~/loaders';
import { useImportFromURL } from '~/usecases/import-from-url.usecase';

export const ImportFromGoogleSheets = component$(() => {
  const config = userServerConfig();
  const nav = useNavigate();

  const url = useSignal('');
  const googleSheetsToken = useSignal('');
  const isImporting = useSignal(false);

  const importFromURI = useImportFromURL();

  const googleOauthURL = useComputed$(() => {
    const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = config.value;

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'token',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  });

  const isValidURL = useComputed$(() => {
    if (!url.value) return false;

    try {
      new URL(url.value);
      return true;
    } catch (e) {
      return false;
    }
  });

  const isGoogleSheetsURL = useComputed$(() => {
    return (
      isValidURL.value && url.value.includes('docs.google.com/spreadsheets')
    );
  });

  const datasetName = $(async () => {
    if (!url.value) return '';

    try {
      if (!isGoogleSheetsURL.value) return url.value.split('/').pop() || '';
      if (isGoogleSheetsURL.value && !googleSheetsToken.value) return '';

      const response = await fetch(url.value, {
        headers: { Authorization: `Bearer ${googleSheetsToken.value}` },
      });

      const text = await response.text();
      const parser = new DOMParser();

      const doc = parser.parseFromString(text, 'text/html');
      const title = doc.querySelector('title')?.innerText || 'Untitled';

      return title;
    } catch (error) {
      console.error('Error getting dataset name:', error);
      return url.value;
    }
  });

  const handleImport = $(async () => {
    isImporting.value = true;

    try {
      const dataset = await importFromURI({
        url: url.value,
        name: await datasetName(),
        secretToken: googleSheetsToken.value,
      });
      nav(`/dataset/${dataset.id}`);
    } finally {
      isImporting.value = false;
    }
  });

  return (
    <div class="flex flex-col w-full max-w-2xl mt-8 gap-4">
      <div class="flex flex-col justify-between gap-4">
        <h1 class="text-3xl font-bold w-full">
          Import Dataset from Google Sheets URL
        </h1>
      </div>

      <div class="text-sm text-gray-500 flex flex-col gap-2">
        <span class="text-xs text-gray-500">
          Please, enter a valid Google Sheets URL. Expore your Google Sheets{' '}
          <a
            href="https://docs.google.com/spreadsheets/u/0/?tgif=d"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-500 underline"
          >
            here
          </a>
          .
        </span>

        <input
          class="h-10 w-full outline-none border border-gray-300 rounded px-3"
          type="text"
          placeholder="Enter or copy/paste the URL"
          value={url.value}
          onInput$={(event) =>
            (url.value = (event.target as HTMLInputElement).value)
          }
        />
        <div>
          {isGoogleSheetsURL.value && (
            <div class="text-sm text-gray-500 flex flex-col gap-2">
              <span class="text-xs text-gray-500">
                To generate a secret for Google Sheets, please follow this{' '}
                <a
                  href={googleOauthURL.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-500 underline"
                >
                  link
                </a>
                . Then paste the token here:
              </span>

              <input
                class="h-10 w-full outline-none border border-gray-300 rounded px-3"
                type="text"
                placeholder="Enter a secret token to import google sheets"
                value={googleSheetsToken.value}
                onInput$={(event) =>
                  (googleSheetsToken.value = (
                    event.target as HTMLInputElement
                  ).value)
                }
              />

              {googleSheetsToken.value && (
                <ImportButton
                  loading={isImporting.value}
                  onClick={handleImport}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface ImportButtonProps {
  disabled?: boolean;
  loading: boolean;
  onClick: () => void;
}

const ImportButton = component$<ImportButtonProps>(
  ({ disabled, loading, onClick }) => {
    return (
      <Button
        look="primary"
        isGenerating={loading}
        disabled={disabled || false}
        onClick$={onClick}
        class="min-w-[180px]"
      >
        {loading ? (
          <div class="flex items-center justify-between w-full px-2">
            <span>Importing</span>
            <div class="animate-spin">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-labelledby="loadingSpinnerTitle"
              >
                <title id="loadingSpinnerTitle">Loading spinner</title>
                <path
                  d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </div>
          </div>
        ) : (
          <div class="flex items-center gap-4">
            <LuChevronRightSquare class="text-xl" />
            <span>Import</span>
          </div>
        )}
      </Button>
    );
  },
);
