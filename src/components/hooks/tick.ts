import { $ } from '@builder.io/qwik';

type Callback = () => void;

export const nextTick = $(async (doAfter: Callback, ms = 1) => {
  return new Promise<void>((resolve) => {
    queueMicrotask(() => {
      setTimeout(resolve, ms);
    });
  }).then(() => doAfter());
});
