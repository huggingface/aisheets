import { type QRL, useSignal, useVisibleTask$ } from '@builder.io/qwik';

export function useClickOutside(callback: QRL<() => void>) {
  const ref = useSignal<Element>();

  useVisibleTask$(({ track }) => {
    track(() => ref.value);

    const handleClickOutside = (event: MouseEvent) => {
      if (document.getSelection()?.toString()) return;
      if (ref.value && !ref.value.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  return ref;
}
