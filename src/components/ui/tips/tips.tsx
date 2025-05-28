import { Slot, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { LuLifeBuoy, LuX } from '@qwikest/icons/lucide';
import { Button } from '~/components/ui/button/button';

export const Tips = component$(() => {
  const isVisible = useSignal(false);

  useVisibleTask$(() => {
    isVisible.value = localStorage.getItem('tips') !== 'false';
  });

  return (
    <div class="fixed bottom-5 right-10 z-50">
      {isVisible.value && (
        <div class="fixed flex flex-col bg-neutral-50 shadow-xl w-96 h-fit bottom-16 right-10 border border-neutral-100 rounded-md z-50">
          <div class="absolute w-full flex justify-end items-center px-3 py-4">
            <Button
              class="p-1.5 rounded-full hover:bg-neutral-200 cursor-pointer"
              look="ghost"
              onClick$={() => {
                isVisible.value = false;

                localStorage.setItem('tips', 'false');
              }}
            >
              <LuX class="text-lg text-neutral" />
            </Button>
          </div>
          <div class="flex flex-col gap-3 p-6 text-primary-600 text-sm">
            <h2 class="text-lg font-medium">Helpful tips</h2>
            <div class="flex flex-col gap-2">
              <Slot />
            </div>
          </div>
          <div class="relative z-50 shadow-lg">
            <div class="absolute w-3 h-3 bg-neutral-50 rotate-45 -bottom-2 right-5 -translate-x-1/2" />
          </div>
        </div>
      )}

      <Button
        look="secondary"
        class="flex items-center gap-2 text-primary-500 px-2 py-1 h-[28px] rounded-sm hover:bg-neutral-200"
        onClick$={() => {
          isVisible.value = true;
        }}
      >
        <LuLifeBuoy class="text-lg" />
        Tips
      </Button>
    </div>
  );
});
