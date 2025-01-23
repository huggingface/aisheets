import { $, useContext, useSignal, useTask$ } from '@builder.io/qwik';

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
  const isOpen = useSignal(false);
  const modals = useContext(modalsContext);

  const change = $((status: Status) => {
    isOpen.value = status === 'open';
    modals.value = {
      ...modals.value,
      [id]: status,
    };
  });

  useTask$(({ track }) => {
    track(() => modals.value[id]);

    isOpen.value = modals.value[id] === 'open';
  });

  useTask$(({ track }) => {
    const newValue = track(() => isOpen.value);

    if (newValue) {
      change('open');
    } else {
      change('closed');
    }
  });

  const modal = {
    isOpen,
    open: $(() => change('open')),
    close: $(() => change('closed')),
  };

  return wrap(id, isOpen, modal.open, modal.close);
};
