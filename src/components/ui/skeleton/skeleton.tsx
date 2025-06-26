import { component$ } from '@builder.io/qwik';

export const Skeleton = component$(() => {
  return (
    <div class="flex items-start h-full py-1 space-x-1">
      <div
        class="w-[5px] h-[5px] bg-ring rounded-full animate-bounce"
        style="animation-delay:0s"
      />
      <div
        class="w-[5px] h-[5px] bg-ring rounded-full animate-bounce"
        style="animation-delay:0.2s"
      />
      <div
        class="w-[5px] h-[5px] bg-ring rounded-full animate-bounce"
        style="animation-delay:0.4s"
      />
    </div>
  );
});
