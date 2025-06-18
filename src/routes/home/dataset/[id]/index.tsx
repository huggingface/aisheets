import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Login } from '~/components/ui/login/Login';
import { MobileBanner } from '~/components/ui/mobile/banner';
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
      <MobileBanner />
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
            <b>Drag to generate new cells:</b> Click and drag down from a cell's
            dot handle to generate content for multiple cells at once.
          </p>
          <p>
            <b>Refine and validate cells:</b> Edit cells directly or use thumbs
            up to mark good examples. The app learns from these examples
            examples to improve the quality of generated cells.
          </p>
          <p>
            <b>Improve prompts and try new models:</b> Use the column settings
            to experiment with prompts and different models, click generate and
            see results in real time.
          </p>
          <p>
            <b>Manage columns:</b> Use the column settings to edit names, hide
            columns, or generate cells. Click + to add new columns for
            translation, keywords, summaries, or using a custom prompt.
          </p>
          <p>
            <b>First column can contain duplicates</b> You can delete rows by
            selecting one or multiple rows and right clicking. To mitigate
            duplication, you can add cells manually or modify the column prompt.
            If search results are not sufficiently complete, the model won't be
            able to generate/pick new values for the cells, in this case
            currently the only option is to add them manually.
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
