import { $, useComputed$, useSignal } from '@builder.io/qwik';

/**
 * Custom hook that provides a toggle functionality.
 *
 * @returns {Object} An object containing:
 * - `value`: A signal representing the current state of the toggle.
 * - `open`: A function to set the toggle state to true.
 * - `close`: A function to set the toggle state to false.
 */
export const useToggle = () => {
  const state = useSignal(false);
  const isOpen = useComputed$(() => state.value === true);

  const open = $(() => {
    state.value = true;
  });

  const close = $(() => {
    state.value = false;
  });

  const toggle = $(() => {
    state.value = !state.value;
  });

  return { isOpen, open, close, toggle };
};
