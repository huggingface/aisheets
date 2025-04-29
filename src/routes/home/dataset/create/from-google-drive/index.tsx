import { component$ } from '@builder.io/qwik';
import { ImportFromGoogleSheets } from '~/features/import-from-google-sheets';
import { MainSidebarButton } from '~/features/main-sidebar';

export default component$(() => {
  return (
    <>
      <MainSidebarButton />
      <ImportFromGoogleSheets />
    </>
  );
});
