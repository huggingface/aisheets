import {
  $,
  type PropsOf,
  Slot,
  component$,
  useOnWindow,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { useModals } from '~/components/hooks';
import type { ID } from '~/components/hooks/modals/config';

interface SidebarProps extends PropsOf<'div'> {
  name: ID;
}

export const Sidebar = component$<SidebarProps>((props) => {
  const { args, generic } = useModals(props.name);
  const nearToPosition = useSignal<{
    left: number;
    right: number;
    top: number;
  } | null>(null);

  const recalculateSidebarPosition = $(() => {
    if (!args.value?.columnId) return;

    const element = document.getElementById(args.value.columnId);

    if (element) {
      const rect = element.getBoundingClientRect();
      const left = rect.left + rect.width;
      const right = rect.right;
      const top = rect.top;

      nearToPosition.value = { left, right, top };
    }

    return element;
  });

  useVisibleTask$(async ({ track }) => {
    track(args);

    await recalculateSidebarPosition();
  });

  useVisibleTask$(async ({ track }) => {
    track(generic.isOpen);
    if (!generic.isOpen.value) return;

    const element = await recalculateSidebarPosition();

    element?.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'center',
    });
  });

  useOnWindow('scroll', recalculateSidebarPosition);

  if (!generic.isOpen.value) return null;

  return (
    <div
      style={{
        top: nearToPosition.value ? `${nearToPosition.value.top}px` : 'unset',
        left: nearToPosition.value ? `${nearToPosition.value.left}px` : 'unset',
        right: nearToPosition.value
          ? `${nearToPosition.value.right}px`
          : 'unset',
      }}
      class={`absolute h-[85%] w-[600px] overflow-auto transform bg-white text-black transition-transform z-20 ${props.class}`}
    >
      <Slot />
    </div>
  );
});
