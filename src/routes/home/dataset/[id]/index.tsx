import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Login } from '~/components/ui/login/Login';
import { Tips } from '~/components/ui/tips/tips';
import { DatasetName } from '~/features/datasets';
import { SaveDataset } from '~/features/export';
import { MainSidebarButton } from '~/features/main-sidebar';

import { Table } from '~/features/table';
import { Username } from '~/features/user/username';
import { useSession } from '~/loaders';
import { ActiveDatasetProvider } from '~/state';

export default component$(() => {
  const session = useSession();

  return (
    <ActiveDatasetProvider>
      <div class="flex flex-col h-full w-full">
        <div class="sticky">
          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center w-full gap-1">
              <div class="flex items-center w-fit gap-4">
                <MainSidebarButton />
                <DatasetName />
                <SaveDataset />
              </div>
              {session.value.anonymous ? <Login /> : <Username />}
            </div>
          </div>
        </div>
        <Table />
        <Tips id="dataset-tips">
          <p>
            <b>Drag to generate:</b> Click and drag down from a cell's dot
            handle to generate content for multiple cells at once.
          </p>
          <p>
            <b>Refine and validate cells:</b> Edit cells directly or use thumbs
            up to mark good examples. Edit cells or use thumbs up to mark good
            examples. The app learns from these examples examples to improve the
            quality of generated cells.
          </p>
          <p>
            <b>Manage columns:</b> Use the column settings to edit names, hide
            columns, or generate cells. Click + to add new columns for
            translation, keywords, summaries, or using a custom prompt.
          </p>
          <p>
            <b>Improve prompts and try new models:</b> Use the column settings
            to experiment with prompts and different models, click generate and
            see results in real time.
          </p>
        </Tips>
      </div>
    </ActiveDatasetProvider>
  );
});

export const head: DocumentHead = {
  title: 'Sheets',
  meta: [
    {
      name: 'Sheets',
      content: 'Sheets',
    },
  ],
};
