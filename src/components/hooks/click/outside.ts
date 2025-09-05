import { $, type QRL, useOnDocument, useSignal } from '@builder.io/qwik';

export function useClickOutside<T extends HTMLElement>(
  onClickOut: QRL<() => void>,
) {
  const ref = useSignal<T>();

  useOnDocument(
    'click',
    $((event) => {
      if (!ref.value) {
        return;
      }
      if (document.getSelection()?.toString()) return;
      const target = event.target as HTMLElement;
      if (!ref.value.contains(target)) {
        onClickOut();
      }
    }),
  );

  return ref;
}

export function useClickOutsideConditionally<T extends HTMLElement>(
  onClickOut: QRL<() => void>,
) {
  const ref = useSignal<T>();

  const listen = useSignal(false);

  const startListening = $(() => {
    listen.value = true;
  });

  const stopListening = $(() => {
    listen.value = false;
  });

  useOnDocument(
    'click',
    $((event) => {
      if (document.getSelection()?.toString()) return;
      if (!ref.value || !listen.value) {
        return;
      }
      const target = event.target as HTMLElement;
      if (!ref.value.contains(target)) {
        onClickOut();
        stopListening();
      }
    }),
  );

  return {
    ref,
    startListening,
    stopListening,
  };
}
