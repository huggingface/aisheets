import { $ } from '@builder.io/qwik';
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

export const isOverlayOpen = $(() => {
  return document.querySelector('.overlay') !== null;
});
