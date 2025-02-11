import { $, component$, useStore } from '@builder.io/qwik';
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

  const handleEditClick = $(() => {
    state.isEditing = true;
  });

  const handleChange = $((event: Event) => {
    const target = event.target as HTMLInputElement;
    state.name = target.value;
  });

  const ref = useClickOutside(
    $(() => {
      state.isEditing = false;

      server$(async (datasetId: string, newName: string) => {
        await updateDataset({ id: datasetId, name: newName });
      })(dataset.id, state.name);

      updateActiveDataset({ ...dataset, name: state.name });
    }),
  );

  return (
    <div>
      {state.isEditing ? (
        <Input
          type="text"
          ref={ref}
          value={state.name}
          onInput$={handleChange}
          class="text-3xl font-bold"
        />
      ) : (
        <h1
          class="text-3xl font-bold text-secondary w-full truncate"
          onClick$={handleEditClick}
        >
          {state.name}
        </h1>
      )}
    </div>
  );
});
