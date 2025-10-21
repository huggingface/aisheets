import { component$, useTask$ } from '@builder.io/qwik';
import {
  type DocumentHead,
  type RequestEvent,
  type RequestHandler,
  useLocation,
} from '@builder.io/qwik-city';
import { Login } from '~/components/ui/login/Login';
import { MobileBanner } from '~/components/ui/mobile/banner';
import { Tips } from '~/components/ui/tips/tips';
import { useExecution } from '~/features/add-column';
import { ExecutionSidebar } from '~/features/add-column/form/execution-sidebar';
import { DatasetName } from '~/features/datasets';
import { SaveDataset } from '~/features/export';
import { MainSidebarButton } from '~/features/main-sidebar';
import { Table } from '~/features/table';
import { Username } from '~/features/user/username';
import { useSession } from '~/loaders';
import { datasetAsJson } from './json/utils';

export const onGet: RequestHandler = async (event: RequestEvent) => {
  const { headers } = event.request;
  const acceptHeader = headers.get('Accept') || headers.get('accept');

  if (acceptHeader?.includes('application/json')) {
    return datasetAsJson(event);
  }
};

export default component$(() => {
  const session = useSession();
  const location = useLocation();
  const { close } = useExecution();

  useTask$(({ track }) => {
    track(() => location.url.href);

    close();
  });

  return (
    <>
      <MobileBanner />
      <ExecutionSidebar />
      <div class="flex flex-col h-full w-full">
        <div class="flex flex-col flex-1 transition-all duration-200">
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
              <b>Refine your prompt</b> and switch <b>models</b> or{' '}
              <b>providers</b> on the fly at the column level.
            </p>
            <p>
              <b>Drag from a cell corner</b> to extend the column (
              <b>only with 100% synthetic data</b>).
            </p>
          </Tips>
        </div>
      </div>
    </>
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
