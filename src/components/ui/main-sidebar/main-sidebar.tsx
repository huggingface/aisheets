import { $, component$, useStore } from '@builder.io/qwik';
import { LuPanelLeftClose, LuPanelLeftOpen } from '@qwikest/icons/lucide';

export const MainSidebar = component$(() => {
  const store = useStore({ isExpanded: true });

  const mockedItems = [
    'Lorem ipsum dolor',
    'Ipsum dolor sit amet',
    'Dolor sit amet consectetur',
    'Sit amet consectetur adipiscing',
    'Amet consectetur adipiscing elit consectetur',
    'Consectetur adipiscing elit',
  ];

  const toggleMenu = $(() => {
    store.isExpanded = !store.isExpanded;
  });

  return (
    <div
      class="bg-gradient-to-r from-white to-gray-50 h-screen transition-all duration-300 ease-in-out shrink-0"
      style={{
        width: store.isExpanded ? '300px' : '50px',
      }}
    >
      {/* Header del menú */}
      <div class="flex justify-between items-center p-2 mb-10 w-full transition-all duration-500 ease-in-out">
        <p
          class={`transition-[opacity, max-height] duration-300 ease-in-out font-mono ${
            store.isExpanded
              ? 'max-h-screen opacity-100 px-4 duration-400'
              : 'max-h-0 opacity-0 px-0'
          } overflow-hidden`}
          style={store.isExpanded ? '' : 'max-height: 0; opacity: 0;'}
        >
          {store.isExpanded && 'Easy Datagen'}
        </p>
        <button
          type="button"
          onClick$={toggleMenu}
          class="rounded p-2 hover:bg-gray-100 text-muted-foreground"
        >
          {store.isExpanded ? (
            <LuPanelLeftClose class="w-5 h-5" />
          ) : (
            <LuPanelLeftOpen class="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Contenedor del menú con transición en el eje horizontal */}
      <div
        class="transition-all duration-500 ease-in-out overflow-auto max-h-full"
        style={{ opacity: store.isExpanded ? '1' : '0' }}
      >
        {store.isExpanded && (
          <div>
            <p class="text-muted-foreground px-6 text-sm font-semibold">
              Today
            </p>
            <div class="block space-y-2 p-4">
              {mockedItems.splice(0, 1).map((item, index) => (
                <button
                  type="button"
                  key={index}
                  class="block px-2 py-1 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
                >
                  {item}
                </button>
              ))}
            </div>
            <p class="text-muted-foreground px-6 text-sm font-semibold">
              7 days
            </p>
            <div class="block space-y-2 p-4">
              {mockedItems.splice(1, mockedItems.length).map((item, index) => (
                <button
                  type="button"
                  key={index}
                  class="block px-2 py-1 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
