import { Slot, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { useModals } from '~/components/hooks';
import type { ID } from '~/components/hooks/modals/config';

export const Sidebar = component$<{
  name: ID;
}>((props) => {
  const { args, generic } = useModals(props.name);
  const nearToPosition = useSignal<{
    left: number;
    right: number;
    top: number;
  } | null>(null);

  useVisibleTask$(async ({ track }) => {
    track(args);

    if (!args.value?.columnId) return;

    const element = document.getElementById(args.value.columnId);
    element?.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'center',
    });

    if (element) {
      const rect = element.getBoundingClientRect();
      const left = rect.left + rect.width;
      const right = rect.right;
      const top = rect.top;

      nearToPosition.value = { left, right, top };
    }
  });

  if (!generic.isOpen.value) return null;

  return (
    <div>
      <div
        style={{
          top: nearToPosition.value ? `${nearToPosition.value.top}px` : 'unset',
          left: nearToPosition.value
            ? `${nearToPosition.value.left}px`
            : 'unset',
          right: nearToPosition.value
            ? `${nearToPosition.value.right}px`
            : 'unset',
        }}
        class={`fixed max-h-[92vh] w-[33vw] overflow-auto transform bg-white text-black transition-transform duration-300 z-20 shadow-md ${
          !args.value?.columnId && 'fixed !right-0 top-2'
        }
        }`}
      >
        <Slot />
      </div>
    </div>
  );
});
