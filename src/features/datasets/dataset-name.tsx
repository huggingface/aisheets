import {
  $,
  component$,
  useStore,
  useVisibleTask$,
  useSignal,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { Input } from '~/components';
import { updateDataset } from '~/services/repository/datasets';
import { type Dataset, useDatasetsStore } from '~/state';

interface DatasetNameProps {
  dataset: Dataset;
}

export const DatasetName = component$(({ dataset }: DatasetNameProps) => {
  const state = useStore({
    isEditing: false,
    name: '',
    displayName: dataset.name,
  });

  const { updateActiveDataset } = useDatasetsStore();

  const inputRef = useSignal<HTMLInputElement>();

  const handleSave = $(() => {
    if (!state.isEditing) return;

    if (state.name.trim() === '') {
      state.name = dataset.name;
      state.isEditing = false;
      return;
    }

    const newName = state.name;
    state.displayName = newName;
    state.isEditing = false;
    updateActiveDataset({ ...dataset, name: newName });

    server$(async (datasetId: string, newName: string) => {
      await updateDataset({ id: datasetId, name: newName });
    })(dataset.id, newName);
  });

  useVisibleTask$(({ track }) => {
    track(() => state.isEditing);
    if (state.isEditing && inputRef.value) {
      inputRef.value.focus();
      inputRef.value.select();
    }
  });

  const handleEditClick = $(() => {
    state.isEditing = true;
    state.name = dataset.name;
    state.displayName = dataset.name;
  });

  const handleChange = $((event: Event) => {
    const target = event.target as HTMLInputElement;
    state.name = target.value;
  });

  const handleKeyDown = $((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      state.name = dataset.name;
      state.isEditing = false;
    }
  });

  return (
    <div class="h-[40px] flex items-center">
      {state.isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={state.name}
          onInput$={handleChange}
          onKeyDown$={handleKeyDown}
          class="text-3xl font-bold w-full px-2 my-0 border-none outline-none leading-none"
        />
      ) : (
        <h1
          class={`text-3xl font-bold w-full min-w-[200px] truncate leading-none px-2 ${
            state.displayName === 'New dataset' ? 'text-secondary' : ''
          }`}
          onClick$={handleEditClick}
        >
          {state.displayName}
        </h1>
      )}
    </div>
  );
});
