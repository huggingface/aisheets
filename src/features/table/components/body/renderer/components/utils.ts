import { $, type Signal } from '@builder.io/qwik';
import { nextTick } from '~/components/hooks/tick';

export const unSelectText = $(() => {
  nextTick(() => {
    if (window.getSelection) {
      window.getSelection()!.removeAllRanges();
    } else if ((document as any).selection) {
      // Old browsers
      (document as any).selection.empty();
    }
  }, 100);
});

export const stopScrolling = $(
  (
    shouldCancelScroll: Signal<boolean>,
    cleanup: (callback: () => void) => void,
  ) => {
    const scrollable = document.querySelector('.scrollable');

    if (shouldCancelScroll.value) {
      scrollable?.classList.add('overflow-hidden');
      scrollable?.classList.add('pr-[15px]');
    }

    cleanup(() => {
      scrollable?.classList.remove('overflow-hidden');
      scrollable?.classList.remove('pr-[15px]');
    });
  },
);
