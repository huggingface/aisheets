import { $, component$, useStore, useVisibleTask$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
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

  return (
    <div class="w-fit">
      {state.isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={state.name}
          onInput$={handleChange}
          onKeyDown$={handleKeyDown}
          class="text-md h-6 font-bold p-0 border-none outline-none leading-none"
          style={{
            width: `${state.name.length}ch`,
          }}
        />
      ) : (
        <h1
          class="text-md font-bold truncate leading-none h-5 mt-1"
          onClick$={handleEditClick}
        >
          {state.displayName}
        </h1>
      )}
    </div>
  );
});
