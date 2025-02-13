import { $, component$, useStore, useVisibleTask$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { Input } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { updateDataset } from '~/services/repository/datasets';
import { type Dataset, useDatasetsStore } from '~/state';

interface DatasetNameProps {
  dataset: Dataset;
}

export const DatasetName = component$(({ dataset }: DatasetNameProps) => {
  const state = useStore({
    isEditing: false,
    name: dataset.name,
  });

  const { updateActiveDataset } = useDatasetsStore();

  const handleSave = $(() => {
    if (state.name.trim() === '') {
      state.name = dataset.name; // Prevent empty names
      return;
    }

    state.isEditing = false;

    server$(async (datasetId: string, newName: string) => {
      await updateDataset({ id: datasetId, name: newName });
    })(dataset.id, state.name);

    updateActiveDataset({ ...dataset, name: state.name });
  });

  const ref = useClickOutside(handleSave);

  useVisibleTask$(({ track }) => {
    track(() => state.isEditing);
    if (state.isEditing) {
      (ref.value as HTMLInputElement)?.focus();
    }
  });

  const handleEditClick = $(() => {
    state.isEditing = true;
  });

  const handleChange = $((event: Event) => {
    const target = event.target as HTMLInputElement;
    state.name = target.value;
  });

  const handleKeyDown = $((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      state.name = dataset.name; // Reset to original name
      state.isEditing = false;
    }
  });

  return (
    <div class="h-[40px] flex items-center">
      {state.isEditing ? (
        <Input
          type="text"
          ref={ref}
          value={state.name}
          onInput$={handleChange}
          onKeyDown$={handleKeyDown}
          class="text-3xl font-bold w-full px-2 my-0 border-none outline-none leading-none"
        />
      ) : (
        <h1
          class={`text-3xl font-bold w-full min-w-[200px] truncate leading-none px-2 ${
            dataset.name === 'New dataset' ? 'text-secondary' : ''
          }`}
          onClick$={handleEditClick}
        >
          {state.name}
        </h1>
      )}
    </div>
  );
});
