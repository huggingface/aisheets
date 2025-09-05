import {
  $,
  component$,
  useComputed$,
  useStore,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { LuLink } from '@qwikest/icons/lucide';
import { Input } from '~/components';
import { useClickOutsideConditionally } from '~/components/hooks/click/outside';
import { nextTick } from '~/components/hooks/tick';
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
    copied: false,
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

  const { ref: inputRef, startListening } =
    useClickOutsideConditionally<HTMLInputElement>(handleSave);

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

      nextTick(() => {
        startListening();
      });
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
      <div class="flex w-fit items-center gap-2">
        <Tooltip text={state.copied ? 'Copied' : 'Copy link'} floating="bottom">
          <LuLink
            class={[
              'text-neutral-500 hover:text-neutral-600 cursor-pointer',
            ].join(' ')}
            onClick$={$(() => {
              navigator.clipboard.writeText(location.href);
              state.copied = true;
              setTimeout(() => {
                state.copied = false;
              }, 1200);
            })}
          />
        </Tooltip>
        {state.isEditing ? (
          <Input
            ref={inputRef}
            type="text"
            value={state.name}
            onInput$={handleChange}
            onKeyDown$={handleKeyDown}
            class="text-md h-6 font-bold leading-none p-0 border-none outline-none max-w-96 min-w-48"
            style={{
              width: `${state.name.length}ch`,
            }}
          />
        ) : isNameTruncated.value ? (
          <Tooltip text={state.name}>
            <h1
              class="text-md h-6 font-bold leading-none mt-2 w-96 truncate text-ellipsis whitespace-nowrap"
              onClick$={handleEditClick}
            >
              {state.displayName}
            </h1>
          </Tooltip>
        ) : (
          <h1
            class="flex w-full text-md h-6 font-bold leading-none mt-2 text-ellipsis whitespace-nowrap"
            onClick$={handleEditClick}
          >
            {state.displayName}
          </h1>
        )}
      </div>
      <p class="text-red-300 absolute">{state.error}</p>
    </div>
  );
});
