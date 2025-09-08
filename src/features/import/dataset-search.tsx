import { $, type QRL, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuCheck } from '@qwikest/icons/lucide';
import { Select, triggerLooks } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { useDebounce } from '~/components/hooks/debounce/debounce';
import { nextTick } from '~/components/hooks/tick';
import { useSession } from '~/loaders';
import { listDatasets } from '~/services/repository/hub/list-datasets';

export const DatasetSearch = component$(
  ({
    onSelectedDataset$,
  }: {
    onSelectedDataset$: QRL<(dataset: string) => void>;
  }) => {
    const isOpen = useSignal(false);
    const isFocusing = useSignal(false);
    const containerRef = useClickOutside(
      $(() => {
        isFocusing.value = false;
        isOpen.value = false;
      }),
    );
    const session = useSession();
    const searchQuery = useSignal('');
    const searchQueryDebounced = useSignal('');
    const selectedDataset = useSignal('');
    const datasets = useSignal<string[]>([]);

    useDebounce(
      searchQuery,
      $(() => {
        searchQueryDebounced.value = searchQuery.value;
      }),
      300,
    );

    const onSearch = $(async (searchQuery: string) => {
      const query = searchQuery.trim();

      const datasets = await listDatasets({
        query,
        accessToken: session.value.token,
        limit: 10,
      });

      return datasets.map((dataset) => dataset.name);
    });

    const handleChangeDataset$ = $((value: string | string[]) => {
      const selected = value as string;
      selectedDataset.value = selected ?? '';

      searchQuery.value = selectedDataset.value;

      onSelectedDataset$(selectedDataset.value);
    });

    useTask$(async ({ track }) => {
      track(searchQueryDebounced);
      if (searchQueryDebounced.value.length < 3) return;

      if (searchQueryDebounced.value === selectedDataset.value) return;

      const result = await onSearch(searchQuery.value);
      datasets.value = result;

      nextTick(() => {
        isOpen.value = datasets.value.length > 0;
      }, 200);
    });

    useTask$(({ track }) => {
      track(searchQuery);

      if (
        searchQuery.value !== selectedDataset.value &&
        datasets.value.length
      ) {
        datasets.value = [];
        isOpen.value = false;
        onSelectedDataset$('');
      }
    });

    return (
      <div class="flex flex-col w-full" ref={containerRef}>
        <Select.Root
          onChange$={handleChangeDataset$}
          bind:open={isOpen}
          class="w-full"
        >
          <Select.Label>Dataset repo</Select.Label>
          <div
            class={cn(
              'w-full flex flex-row justify-between items-center',
              triggerLooks('default'),
              {
                'ring-1 ring-ring': isFocusing.value,
              },
            )}
          >
            <input
              stoppropagation:click
              class="h-8 w-full outline-none"
              placeholder="Type at least 3 characters to search datasets"
              bind:value={searchQuery}
              onClick$={() => {
                isFocusing.value = true;
              }}
            />
            <Select.Trigger look="headless" />
          </div>
          <Select.Popover
            floating="bottom-end"
            gutter={8}
            class={cn('w-full ml-3', {
              'opacity-0 hidden': !datasets.value.length,
            })}
          >
            {datasets.value.map((dataset) => (
              <Select.Item
                key={dataset}
                value={dataset}
                class="select-item w-full"
              >
                <Select.ItemLabel class="truncate max-w-xl">
                  {dataset}
                </Select.ItemLabel>
                <Select.ItemIndicator>
                  <LuCheck class="h-4 w-4 flex-shrink-0" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popover>
        </Select.Root>
      </div>
    );
  },
);
