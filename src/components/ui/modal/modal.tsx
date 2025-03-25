import {
  type PropsOf,
  Slot,
  component$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { Label } from '@qwik-ui/headless';
import { LuX } from '@qwikest/icons/lucide';
import { useModals } from '~/components/hooks';
import type { ID } from '~/components/hooks/modals/config';

interface ModalProps extends PropsOf<'div'> {
  name: ID;
  title: string;
}

export const Modal = component$<ModalProps>(({ name, title, ...rest }) => {
  const {
    generic: { isOpen, close },
  } = useModals(name);

  useVisibleTask$(({ track }) => {
    track(isOpen);

    const main = document.querySelector('main')!;

    if (isOpen.value) {
      const stickies = document.querySelectorAll('.sticky');
      for (const sticky of stickies) {
        sticky.classList.remove('sticky');
        sticky.classList.add('sticky-temp');
      }

      main.classList.add('pointer-events-none');
    } else {
      const stickies = document.querySelectorAll('.sticky-temp');
      for (const sticky of stickies) {
        sticky.classList.remove('sticky-temp');
        sticky.classList.add('sticky');
      }

      main.classList.remove('pointer-events-none');
    }
  });

  if (!isOpen.value) return null;

  return (
    <div
      class={`!pointer-events-auto absolute h-fit overflow-auto transform bg-white text-black transition-transform z-20 border border-neutral-300 rounded-sm ${rest.class}`}
    >
      <div class="flex h-full flex-col justify-between p-4">
        <div class="flex w-full items-center h-12 relative">
          <Label>{title}</Label>
          <div
            class="absolute -top-1 -right-1 p-1.5 rounded-full hover:bg-neutral-100 cursor-pointer transition-colors"
            onClick$={close}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
          >
            <LuX class="text-lg text-neutral" />
          </div>
        </div>
        <Slot />
      </div>
    </div>
  );
});
