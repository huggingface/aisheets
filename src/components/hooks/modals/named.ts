import type { QRL, Signal } from '@builder.io/qwik';

import type { ID } from '~/components/hooks/modals/config';

type Modal<N extends string, A> = {
  [K in `isOpen${Capitalize<N>}`]: Signal<boolean>;
} & {
  [K in `open${Capitalize<N>}`]: QRL<(...args: any) => Promise<void>>;
} & {
  [K in `close${Capitalize<N>}`]: QRL<() => Promise<void>>;
} & {
  args: Signal<A>;
} & {
  generic: {
    isOpen: Signal<boolean>;
    open: QRL<(...args: any) => Promise<void>>;
    close: QRL<() => Promise<void>>;
  };
};

export const wrap = <N extends ID, A>(
  id: N,
  isOpen: Signal<boolean>,
  open: QRL<(...args: any) => Promise<void>>,
  close: QRL<() => Promise<void>>,
  args: Signal<A>,
): Modal<N, A> => {
  const upperCase = id.charAt(0).toUpperCase() + id.slice(1);

  const wrapped = {
    [`isOpen${upperCase}`]: isOpen,
    [`open${upperCase}`]: open,
    [`close${upperCase}`]: close,
    args,
    generic: {
      isOpen,
      open,
      close,
    },
  };

  return wrapped as Modal<N, A>;
};
