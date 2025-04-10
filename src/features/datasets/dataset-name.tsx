import { $, component$, useStore, useVisibleTask$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { Input } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { updateDataset } from '~/services/repository/datasets';
import { useDatasetsStore } from '~/state';

export const DatasetName = component$(() => {
  const { activeDataset } = useDatasetsStore();

  const state = useStore({
    isEditing: false,
    name: '',
    displayName: activeDataset.value.name,
  });

  const { updateOnActiveDataset } = useDatasetsStore();

  const handleSave = $(() => {
    if (!state.isEditing) return;

    if (state.name.trim() === '') {
      state.name = activeDataset.value.name;
      state.isEditing = false;
      return;
    }

    const newName = state.name;
    state.displayName = newName;
    state.isEditing = false;
    updateOnActiveDataset({ name: newName });

    server$(async (datasetId: string, newName: string) => {
      await updateDataset({ id: datasetId, name: newName });
    })(activeDataset.value.id, newName);
  });

  const inputRef = useClickOutside<HTMLInputElement>(handleSave);

  useVisibleTask$(({ track }) => {
    track(activeDataset);

    state.name = activeDataset.value.name;
    state.displayName = activeDataset.value.name;
  });

  useVisibleTask$(({ track, cleanup }) => {
    track(() => state.isEditing);
    if (state.isEditing && inputRef.value) {
      inputRef.value.focus();
      inputRef.value.select();
    }
  });

  const handleEditClick = $(() => {
    state.isEditing = true;
    state.name = activeDataset.value.name;
    state.displayName = activeDataset.value.name;
  });

  const handleChange = $((event: Event) => {
    const target = event.target as HTMLInputElement;
    state.name = target.value;
  });

  const handleKeyDown = $((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      state.name = activeDataset.value.name;
      state.isEditing = false;
    }
  });

  const isDefaultName = state.displayName === 'New dataset';

  return (
    <div class="h-[40px] flex items-center w-fit">
      {state.isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={state.name}
          onInput$={handleChange}
          onKeyDown$={handleKeyDown}
          class="text-3xl font-bold px-2 my-0 border-none outline-none leading-none w-fit"
        />
      ) : (
        <h1
          class={cn('text-3xl font-bold truncate leading-none', {
            'text-neutral-400': isDefaultName,
          })}
          onClick$={handleEditClick}
        >
          {state.displayName}
        </h1>
      )}
    </div>
  );
});
