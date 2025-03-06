import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { useToggle } from '~/components/hooks';
import { Logo } from '~/components/ui/logo/logo';

import {
  LuLibrary,
  LuPanelLeftClose,
  LuPanelLeftOpen,
} from '@qwikest/icons/lucide';
import { useAllDatasetsLoader } from '~/loaders';

export const MainSidebar = component$(() => {
  const { isOpen, toggle } = useToggle();
  const datasets = useAllDatasetsLoader();

  return (
    <div
      class={`transition-color shrink-0 ${
        isOpen.value
          ? 'bg-gradient-to-r from-white to-gray-50 h-screen'
          : 'bg-white'
      }`}
    >
      <div
        class={`transition-all duration-300 flex items-center justify-between py-2 px-4 ${
          isOpen.value ? 'min-w-[300px]' : 'min-w-0'
        }`}
      >
        <button
          type="button"
          onClick$={toggle}
          class="transition-opacity duration-300 ease-in-out rounded p-2 hover:bg-gray-100 text-muted-foreground"
        >
          {isOpen.value ? (
            <LuPanelLeftClose class="w-5 h-5" />
          ) : (
            <LuPanelLeftOpen class="w-5 h-5" />
          )}
        </button>
      </div>

      <div
        class="transition-all duration-300 shrink-0"
        style={{
          width: isOpen.value ? '300px' : '0',
          opacity: isOpen.value ? '1' : '0',
        }}
      >
        <div class="transition-all duration-300 ease-in-out overflow-auto max-h-full">
          <>
            <div class="block space-y-2 p-4 mb-4">
              <Link
                href="/"
                class="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
              >
                <Logo
                  class="w-5 h-5 rotate-15"
                  fillColor="#89FF14"
                  strokeColor="#849AFF"
                />
                Create Dataset
              </Link>
              <Link class="flex items-center select-none gap-2 px-2 py-1 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full">
                <LuLibrary class="w-5 h-5 text-muted-foreground" />
                Prompt gallery
              </Link>
            </div>

            <div>
              <p class="text-muted-foreground px-6 text-sm font-semibold">
                Today
              </p>
              <div class="block space-y-2 p-4 mb-4">
                {datasets.value.map((item) => (
                  <Link
                    type="button"
                    key={item.id}
                    href={`/dataset/${item.id}`}
                    class="block px-2 py-1 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </>
        </div>
      </div>
    </div>
  );
});
