import { component$ } from '@builder.io/qwik';

export const Skeleton = component$(() => {
  return (
    <div class="flex items-start py-9 h-full space-x-2">
      <div class="w-2 h-2 bg-ring rounded-full animate-[bounce_1.4s_infinite]" />
      <div class="w-2 h-2 bg-ring rounded-full animate-[bounce_1.4s_infinite_0.2s]" />
      <div class="w-2 h-2 bg-ring rounded-full animate-[bounce_1.4s_infinite_0.4s]" />
    </div>
  );
});
