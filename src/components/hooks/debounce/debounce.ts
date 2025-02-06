import { type QRL, type Signal, useTask$ } from '@builder.io/qwik';

export function useDebounce<T>(
  value: Signal<T>,
  callback: QRL<(value: Signal<T>) => void>,
  delay: number,
) {
  useTask$(({ track, cleanup }) => {
    track(value);

    const timeoutId = setTimeout(() => {
      callback(value);
    }, delay);

    cleanup(() => {
      clearTimeout(timeoutId);
    });
  });
}
