import {
  $,
  component$,
  useComputed$,
  useStore,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { Input } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { updateDataset } from '~/services/repository/datasets';
import { useDatasetsStore } from '~/state';

export const DatasetName = component$(() => {
  const { activeDataset } = useDatasetsStore();

  const state = useStore({
    isEditing: false,
    error: '',
    name: '',
    displayName: activeDataset.value.name,
  });

  const { updateOnActiveDataset } = useDatasetsStore();

  const handleSave = $(async () => {
    if (!state.isEditing) return;

    if (state.name.trim() === '') {
      state.name = activeDataset.value.name;
      state.isEditing = false;
      return;
    }

    const newName = state.name;
    state.displayName = newName;

    updateOnActiveDataset({ name: newName });

    const error = await server$(async (datasetId: string, newName: string) => {
      if (newName.length === 0) {
        return 'Dataset name cannot be empty.';
      }

      if (newName.length > 100) {
        return 'Dataset name cannot exceed 100 characters.';
      }

      await updateDataset({ id: datasetId, name: newName });
    })(activeDataset.value.id, newName);

    state.error = error ?? '';
    if (!state.error) {
      state.isEditing = false;
    }
  });

  const inputRef = useClickOutside<HTMLInputElement>(handleSave);

  useVisibleTask$(({ track }) => {
    track(activeDataset);

    state.name = activeDataset.value.name;
    state.displayName = activeDataset.value.name;
  });

  useVisibleTask$(({ track }) => {
    track(() => state.isEditing);
    if (state.isEditing && inputRef.value) {
      inputRef.value.focus();
      inputRef.value.select();
    }
  });

  const isNameTruncated = useComputed$(() => {
    return state.displayName.length > 40;
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
    <div class="w-fit max-w-1/2">
      {state.isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={state.name}
          onInput$={handleChange}
          onKeyDown$={handleKeyDown}
          class="text-md h-6 font-bold p-0 border-none outline-none leading-none w-96 max-w-96"
        />
      ) : isNameTruncated.value ? (
        <Tooltip text={state.name} floating="bottom-end">
          <h1
            class="text-md font-bold h-6 mt-2 leading-none w-96 truncate text-ellipsis whitespace-nowrap"
            onClick$={handleEditClick}
          >
            {state.displayName}
          </h1>
        </Tooltip>
      ) : (
        <h1
          class="text-md font-bold h-6 mt-2 leading-none w-96 truncate text-ellipsis whitespace-nowrap"
          onClick$={handleEditClick}
        >
          {state.displayName}
        </h1>
      )}
      <p class="text-red-300 absolute">{state.error}</p>
    </div>
  );
});
