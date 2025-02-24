import type { QRL, Signal } from '@builder.io/qwik';

import type { ID } from '~/components/hooks/modals/config';

type Modal<N extends string> = {
  [K in `isOpen${Capitalize<N>}`]: Signal<boolean>;
} & {
  [K in `open${Capitalize<N>}`]: QRL<(...args: any) => Promise<void>>;
} & {
  [K in `close${Capitalize<N>}`]: QRL<() => Promise<void>>;
} & {
  generic: {
    isOpen: Signal<boolean>;
    open: QRL<(...args: any) => Promise<void>>;
    close: QRL<() => Promise<void>>;
  };
};

export const wrap = <N extends ID>(
  id: N,
  isOpen: Signal<boolean>,
  open: QRL<(...args: any) => Promise<void>>,
  close: QRL<() => Promise<void>>,
): Modal<N> => {
  const upperCase = id.charAt(0).toUpperCase() + id.slice(1);

  const wrapped = {
    [`isOpen${upperCase}`]: isOpen,
    [`open${upperCase}`]: open,
    [`close${upperCase}`]: close,
    generic: {
      isOpen,
      open,
      close,
    },
  };

  return wrapped as Modal<N>;
};
