import { $, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuPanelLeft } from '@qwikest/icons/lucide';
import { isToday } from 'date-fns';
import { useModals } from '~/components/hooks';
import { useClickOutside } from '~/components/hooks/click/outside';
import { Login } from '~/components/ui/login/Login';
import { MainLogo } from '~/components/ui/logo/logo';
import { useAllDatasetsLoader, useSession } from '~/loaders';
import { useDatasetsStore } from '~/state';

export const MainSidebarButton = component$(() => {
  const { isOpenMainSidebar, openMainSidebar, closeMainSidebar } =
    useModals('mainSidebar');

  const handleClick$ = $(() => {
    if (isOpenMainSidebar.value) {
      return closeMainSidebar();
    }

    openMainSidebar();
  });

  return (
    <button
      type="button"
      onClick$={handleClick$}
      class="w-[30px] h-[30px] transition-all duration-300 p-1.5 rounded-full hover:bg-neutral-200 text-gray-400"
    >
      <LuPanelLeft class="text-lg" />
    </button>
  );
});

export const MainSidebar = component$(() => {
  const { isOpenMainSidebar, closeMainSidebar } = useModals('mainSidebar');
  const { activeDataset } = useDatasetsStore();
  const datasetsLoaded = useAllDatasetsLoader();
  const session = useSession();

  const datasets = useSignal(datasetsLoaded.value);

  const ref = useClickOutside(
    $(() => {
      if (isOpenMainSidebar.value) {
        closeMainSidebar();
      }
    }),
  );

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

      datasets.value = datasets.value.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        return 0;
      });
    }
  });

  const todayDatasets = datasets.value.filter(
    (d) => d.createdAt && isToday(new Date(d.createdAt)),
  );
  const previousDatasets = datasets.value.filter(
    (d) => !d.createdAt || !isToday(new Date(d.createdAt)),
  );

  return (
    <div
      ref={ref}
      class={cn(
        'transition-all absolute z-[52] md:relative duration-300 shrink-0 overflow-hidden w-0 h-screen bg-gradient-to-r from-white to-gray-50',
        {
          'w-[274px] flex flex-col': isOpenMainSidebar.value,
        },
      )}
    >
      <div>
        <div
          class={cn('flex items-center justify-between px-2 mt-5 w-[274px]')}
        >
          <span class="text-base font-semibold px-4 font-inter">Sheets</span>
          <div class="md:hidden">
            <MainSidebarButton />
          </div>
        </div>
        <div class="block space-y-4 px-4 mt-6 w-[274px]">
          <Link
            href="/"
            class="flex items-center gap-3 py-2 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full pl-3"
          >
            <MainLogo
              class="w-6 h-6 rotate-15"
              fillColor="#89FF14"
              strokeColor="#849AFF"
            />
            Create a dataset
          </Link>
          {/* <Tooltip text="Coming soon!">
            <Link class="flex items-center select-none gap-3 py-2 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full pl-3">
              <LuLibrary class="w-6 h-6 text-muted-foreground" />
              Prompt library
            </Link>
          </Tooltip> */}
        </div>
      </div>

      {session.value.anonymous ? (
        <div class="w-[273px] h-fit p-[18px]">
          <div class="w-full h-full p-4 rounded-md bg-neutral-200">
            <div class="flex flex-col justify-center gap-3 text-sm">
              <p class="font-medium">Log in with Hugging Face</p>

              <p>
                Access your datasets history and share what you're building on
                the Hub — it’s free.
              </p>

              <Login />
            </div>
          </div>
        </div>
      ) : (
        <div class="flex-1 flex flex-col overflow-y-auto">
          {todayDatasets.length > 0 && (
            <div class="mt-8">
              <p class="text-muted-foreground px-4 text-sm font-semibold mb-4">
                Today
              </p>
              <div class="block space-y-3 px-4">
                {todayDatasets.map((item) => (
                  <Link
                    type="button"
                    key={item.id}
                    href={`/home/dataset/${item.id}`}
                    class="block py-2 pl-3 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {previousDatasets.length > 0 && (
            <div class="mt-8">
              <p class="text-muted-foreground px-4 text-sm font-semibold mb-4">
                Previous
              </p>
              <div class="block space-y-3 px-4">
                {previousDatasets.map((item) => (
                  <Link
                    type="button"
                    key={item.id}
                    href={`/home/dataset/${item.id}`}
                    class="block py-2 pl-3 hover:bg-gray-100 rounded text-sm font-light truncate max-w-full"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
