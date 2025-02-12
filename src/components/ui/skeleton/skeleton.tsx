import { component$ } from '@builder.io/qwik';

export const Skeleton = component$(() => {
  return (
    <div class="flex items-start py-10 h-full space-x-1">
      <div class="w-[4px] h-[4px] bg-ring rounded-full animate-[bounce_1.4s_infinite]" />
      <div class="w-[4px] h-[4px] bg-ring rounded-full animate-[bounce_1.4s_infinite_0.2s]" />
      <div class="w-[4px] h-[4px] bg-ring rounded-full animate-[bounce_1.4s_infinite_0.4s]" />
    </div>
  );
});
