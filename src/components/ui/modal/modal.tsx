import { type PropsOf, Slot, component$ } from '@builder.io/qwik';
import { Label } from '@qwik-ui/headless';
import { LuXCircle } from '@qwikest/icons/lucide';
import { useModals } from '~/components/hooks';
import type { ID } from '~/components/hooks/modals/config';
import { Button } from '~/components/ui/button/button';

interface ModalProps extends PropsOf<'div'> {
  name: ID;
  title: string;
}

export const Modal = component$<ModalProps>(({ name, title, ...rest }) => {
  const {
    generic: { isOpen, close },
  } = useModals(name);

  if (!isOpen.value) return null;

  return (
    <div
      class={`absolute h-fit overflow-auto transform bg-white text-black transition-transform z-20 ${rest.class}`}
    >
      <div class="flex h-full flex-col justify-between p-4">
        <div class="flex w-full items-center h-12 relative">
          <Label>{title}</Label>
          <Button
            size="sm"
            look="ghost"
            class="absolute top-0 right-0"
            onClick$={close}
          >
            <LuXCircle class="text-lg text-primary-foreground" />
          </Button>
        </div>
        <Slot />
      </div>
    </div>
  );
});
