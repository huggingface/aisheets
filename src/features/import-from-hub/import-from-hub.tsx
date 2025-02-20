import { $, component$, useSignal } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';

import { Button, Input, Label } from '~/components';
import { useImportFromHub } from '~/usecases/import-from-hub.usecase';

const importFromHub = useImportFromHub();

export const ImportFromHub = component$(() => {
  const nav = useNavigate();
  const repoId = useSignal<string | undefined>(undefined);

  const handleOnClickImportFromHub = $(async () => {
    try {
      const { id } = await importFromHub({
        repoId: repoId.value!,
        // TODO: compute subset and splits when selecting repoId, and pass them here
      });
      nav('/dataset/' + id);
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <>
      <div class="flex h-full flex-col justify-between p-4">
        <div class="h-full">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <Label for="dataset-owner">Repo id</Label>
            </div>
            <Input
              id="dataset-owner"
              class="h-10"
              placeholder="Enter the repo id"
              bind:value={repoId}
            />
          </div>
        </div>

        <div class="flex h-16 w-full items-center justify-center">
          <Button
            size="sm"
            class="w-full rounded-sm p-2"
            onClick$={handleOnClickImportFromHub}
          >
            Import dataset
          </Button>
        </div>
      </div>
    </>
  );
});
