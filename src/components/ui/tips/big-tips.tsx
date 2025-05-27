import { Slot, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { LuArrowUpRight, LuX } from '@qwikest/icons/lucide';
import { Button } from '~/components/ui/button/button';

export const BigTips = component$(() => {
  const isVisible = useSignal(false);

  useVisibleTask$(() => {
    isVisible.value = localStorage.getItem('tips') !== 'false';
  });

  return (
    <div class="z-[51]">
      {isVisible.value && (
        <div class="fixed top-0 left-0 w-full h-full bg-black/30 flex items-center justify-center z-[51]">
          <div class="flex flex-col bg-neutral-50 shadow-xl w-fit h-fit border border-neutral-100 rounded-md z-[51] relative">
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
              <h2 class="text-lg font-semibold">Helpful tips</h2>
              <div class="flex flex-col gap-1">
                <Slot />
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        look="ghost"
        class="flex items-center gap-2 font-s text-primary-600 px-2 py-1 h-[28px] rounded-sm hover:bg-neutral-200"
        onClick$={() => {
          isVisible.value = true;
        }}
      >
        More info
        <LuArrowUpRight class="text-lg text-neutral" />
      </Button>
    </div>
  );
});
