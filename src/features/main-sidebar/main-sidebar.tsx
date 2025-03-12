import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { useToggle } from '~/components/hooks';
import { Logo } from '~/components/ui/logo/logo';

import { LuLibrary, LuPanelLeft } from '@qwikest/icons/lucide';
import { useAllDatasetsLoader } from '~/loaders';

export const MainSidebar = component$(() => {
  const { isOpen, toggle } = useToggle(true);
  const datasets = useAllDatasetsLoader();

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
            class="absolute right-2 transition-all duration-300 rounded hover:bg-gray-100 text-gray-400"
          >
            {isOpen.value ? (
              <LuPanelLeft class="w-4 h-4" />
            ) : (
              <LuPanelLeft class="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isOpen.value && (
        <div class="transition-all duration-300">
          <div class="overflow-y-auto overflow-x-hidden">
            <div class="block space-y-4 px-4 mt-8 mb-8">
              <Link
                href="/"
                class="flex items-center gap-3 py-2 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
              >
                <Logo
                  class="w-6 h-6 rotate-15"
                  fillColor="#89FF14"
                  strokeColor="#849AFF"
                />
                Create a dataset
              </Link>
              <Link class="flex items-center select-none gap-3 py-2 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full">
                <LuLibrary class="w-6 h-6 text-muted-foreground" />
                Prompt library
              </Link>
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
                    class="block py-2 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
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
