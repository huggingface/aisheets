import {
  $,
  type PropsOf,
  Slot,
  component$,
  useOnDocument,
} from '@builder.io/qwik';
import { LuXCircle } from '@qwikest/icons/lucide';
import { useModals } from '~/components/hooks';
import type { ID } from '~/components/hooks/modals/config';
import { Button } from '~/components/ui/button/button';

interface ModalProps extends PropsOf<'div'> {
  name: ID;
  title: string;
  variant?: 'default' | 'clean';
}

export const Modal = component$<ModalProps>(
  ({ name, title, variant = 'default', ...rest }) => {
    const {
      generic: { isOpen, close },
    } = useModals(name);

    useOnDocument(
      'keydown',
      $((e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen.value) {
          close();
        }
      }),
    );

    if (!isOpen.value) return null;

    const handleOverlayClick = $((e: any) => {
      const overlay = e.currentTarget;
      const clickedElement = e.target;

      if (clickedElement === overlay) {
        e.stopPropagation();
        close();
      }
    });

    if (variant === 'clean') {
      return (
        <div
          class="fixed inset-0 z-50 bg-transparent"
          onClick$={handleOverlayClick}
        >
          <div class="absolute inset-0 flex items-center justify-center">
            <div class={rest.class}>
              <Slot />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        class="fixed inset-0 z-50 bg-transparent"
        onClick$={handleOverlayClick}
      >
        <div class={rest.class}>
          <div class="bg-white border border-neutral-300 rounded-sm p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-medium">{title}</h2>
              <Button size="sm" look="ghost" onClick$={close}>
                <LuXCircle class="text-lg text-neutral" />
              </Button>
            </div>
            <Slot />
          </div>
        </div>
      </div>
    );
  },
);
