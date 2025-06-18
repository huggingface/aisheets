import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { LuX } from '@qwikest/icons/lucide';
import { Button } from '~/components/ui/button/button';

export const MobileBanner = component$(() => {
  const isVisible = useSignal(false);

  useVisibleTask$(() => {
    isVisible.value = localStorage.getItem('mobile_banner') !== 'false';
  });

  if (!isVisible.value) {
    return null;
  }

  return (
    <div class="fixed top-0 left-0 right-0 z-[53] visible md:invisible">
      <div
        class="bg-blue-100 border-t border-b border-blue-500 text-blue-700 px-4 py-1"
        role="alert"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="font-bold">Sheets is optimized for desktop use</p>
          <Button
            look="ghost"
            class="text-blue-500 hover:text-blue-700"
            onClick$={() => {
              isVisible.value = false;
              localStorage.setItem('mobile_banner', 'false');
            }}
          >
            <LuX class="text-lg" />
          </Button>
        </div>
        <p class="text-sm">
          Please use a larger-screen device for the best experience, including
          full table interaction and access to all features.
        </p>
      </div>
    </div>
  );
});
