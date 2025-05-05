import { component$ } from '@builder.io/qwik';
import { ImportFromHub } from '~/features/import/import-from-hub';
import { MainSidebarButton } from '~/features/main-sidebar';

export default component$(() => {
  return (
    <>
      <MainSidebarButton />
      <ImportFromHub />
    </>
  );
});
