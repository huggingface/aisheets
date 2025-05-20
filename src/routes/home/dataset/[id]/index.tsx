import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Login } from '~/components/ui/login/Login';
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
      </div>
    </ActiveDatasetProvider>
  );
});

export const head: DocumentHead = {
  title: 'Dataground',
  meta: [
    {
      name: 'Dataground',
      content: 'dataground',
    },
  ],
};
