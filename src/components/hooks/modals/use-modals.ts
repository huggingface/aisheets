import { $, useComputed$, useContext } from '@builder.io/qwik';

import type { ID, Status } from '~/components/hooks/modals/config';
import { modalsContext } from '~/components/hooks/modals/context';
import { wrap } from '~/components/hooks/modals/named';

/**
 * Hook to manage the state of modals.
 *
 * @param {N} id - The unique identifier for the modal.
 * You can find the list of available modals in the `config.ts` file.
 * @returns ReturnType<{
 * isOpen: Signal<boolean>;
 * open: QRL<() => Promise<void>>;
 * close: QRL<() => Promise<void>>
 * }>
 *
 * @example
 * const { isOpenMyModal, openMyModal, closeMyModal } = useModals("myModal");
 *
 * // Open the modal
 * openMyModal();
 *
 * // Close the modal
 * closeMyModal();
 *
 * // Check if the modal is open
 * console.log(isOpenMyModal.value); // true or false
 */
export const useModals = <N extends ID>(id: N) => {
  const modalContext = useContext(modalsContext);
  const isOpen = useComputed$(
    () => modalContext.value.modals[id].status === 'open',
  );

  const change = $((status: Status, args: unknown) => {
    modalContext.value = {
      active: status === 'open' ? id : null,
      modals: {
        ...modalContext.value.modals,
        [id]: {
          status,
          args: status === 'open' ? args : null,
        },
      },
    };
  });

  const modal = {
    open: $((args: unknown) => change('open', args)),
    close: $(() => change('closed', null)),
  };

  return wrap(id, isOpen, modal.open, modal.close);
};

export const useActiveModal = () => {
  const modalContext = useContext(modalsContext);

  const activeModal = useComputed$(() => modalContext.value.active);
  const modal = useComputed$(() => {
    if (!activeModal.value) return null;

    return modalContext.value.modals[activeModal.value];
  });

  const isOpen = useComputed$(() => modal.value?.status === 'open');

  return {
    isOpen,
    close: $(() => {
      if (!activeModal.value) return;

      modalContext.value = {
        active: null,
        modals: {
          ...modalContext.value.modals,
          [activeModal.value]: {
            status: 'closed',
          },
        },
      };
    }),
  };
};
