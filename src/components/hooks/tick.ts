import { $ } from '@builder.io/qwik';

type Callback = () => void;

export const nextTick = $(async (doAfter: Callback) => {
  return new Promise<void>((resolve) => {
    queueMicrotask(() => {
      setTimeout(resolve, 0);
    });
  }).then(() => doAfter());
});
