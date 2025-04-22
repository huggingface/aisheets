import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { useToggle } from '~/components/hooks';
import { Logo } from '~/components/ui/logo/logo';
import { Tooltip } from '~/components/ui/tooltip/tooltip';

import { LuLibrary, LuPanelLeft } from '@qwikest/icons/lucide';
import { useAllDatasetsLoader } from '~/loaders';
import { useDatasetsStore } from '~/state';

export const MainSidebar = component$(() => {
  const { isOpen, toggle } = useToggle(true);
  const { activeDataset } = useDatasetsStore();
  const datasetsLoaded = useAllDatasetsLoader();
  const datasets = useSignal(datasetsLoaded.value);

  useTask$(({ track }) => {
    track(activeDataset);
    if (!activeDataset.value?.id) return;

    const found = datasets.value.find((d) => d.id === activeDataset.value.id);

    if (found) {
      found.name = activeDataset.value.name;

      datasets.value = datasets.value.map((dataset) =>
        dataset.id === activeDataset.value.id ? found : dataset,
      );
    } else {
      datasets.value.push(activeDataset.value);
    }
  });

  return (
    <div
      class={`transition-all duration-300 shrink-0 overflow-hidden ${
        isOpen.value
          ? 'bg-gradient-to-r from-white to-gray-50 h-screen w-[240px]'
          : 'bg-white w-10'
      }`}
    >
      <div class="h-14 relative">
        <div
          class={`absolute inset-0 transition-all duration-300 flex items-center ${
            isOpen.value ? 'w-[240px]' : 'w-10'
          }`}
        >
          {isOpen.value && (
            <span class="text-base font-semibold px-4 font-inter">
              DataGround
            </span>
          )}
          <button
            type="button"
            onClick$={toggle}
            class="absolute right-2 transition-all duration-300 p-1.5 rounded-full hover:bg-neutral-200 text-gray-400"
          >
            <LuPanelLeft class="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOpen.value && (
        <div class="transition-all duration-300">
          <div class="overflow-y-auto overflow-x-hidden">
            <div class="block space-y-4 px-4 mt-8 mb-8">
              <Link
                href="/"
                class="flex items-center gap-3 py-2 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full pl-3"
              >
                <Logo
                  class="w-6 h-6 rotate-15"
                  fillColor="#89FF14"
                  strokeColor="#849AFF"
                />
                Create a dataset
              </Link>
              <Tooltip text="Coming soon!">
                <Link class="flex items-center select-none gap-3 py-2 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full pl-3">
                  <LuLibrary class="w-6 h-6 text-muted-foreground" />
                  Prompt library
                </Link>
              </Tooltip>
            </div>

            <div>
              <p class="text-muted-foreground px-4 text-sm font-semibold mb-4">
                Today
              </p>
              <div class="block space-y-3 px-4">
                {datasets.value.map((item) => (
                  <Link
                    type="button"
                    key={item.id}
                    href={`/dataset/${item.id}`}
                    class="block py-2 pl-3 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
