import { $, useSignal } from '@builder.io/qwik';

/**
 * Custom hook that provides a toggle functionality.
 *
 * @returns {Object} An object containing:
 * - `value`: A signal representing the current state of the toggle.
 * - `open`: A function to set the toggle state to true.
 * - `close`: A function to set the toggle state to false.
 */
export const useToggle = () => {
  const toggle = useSignal(false);

  const open = $(() => {
    toggle.value = true;
  });

  const close = $(() => {
    toggle.value = false;
  });

  return { value: toggle, open, close };
};
