import {
  $,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { Input } from '~/components';
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

  const inputRef = useSignal<HTMLInputElement>();

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
          class="text-3xl font-bold w-full px-2 my-0 border-none outline-none leading-none"
        />
      ) : (
        <h1
          class={`text-3xl font-bold w-full min-w-[200px] truncate leading-none px-2 ${isDefaultName ? 'text-neutral-400' : ''}`}
          onClick$={handleEditClick}
        >
          {state.displayName}
        </h1>
      )}
    </div>
  );
});
