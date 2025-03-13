import { type PropsOf, Slot, component$ } from '@builder.io/qwik';
import { useModals } from '~/components/hooks';
import type { ID } from '~/components/hooks/modals/config';

interface ModalProps extends PropsOf<'div'> {
  name: ID;
  title: string;
  variant?: 'default' | 'clean';
}

export const Modal = component$<ModalProps>(
  ({ name, variant = 'default', ...rest }) => {
    const {
      generic: { isOpen, close },
    } = useModals(name);

    if (!isOpen.value) return null;

    if (variant === 'clean') {
      return (
        <div
          class="fixed inset-0 flex items-center justify-center bg-transparent"
          onClick$={(e) => {
            if (e.target === e.currentTarget) {
              close();
            }
          }}
          onKeyDown$={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
        >
          <div class={rest.class}>
            <Slot />
          </div>
        </div>
      );
    }

    return (
      <div class="absolute bg-white border border-neutral-300 rounded-sm p-4">
        <Slot />
      </div>
    );
  },
);
