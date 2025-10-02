import { createContextId, type Signal } from '@builder.io/qwik';
import type { State } from '~/components/hooks/modals/config';

export const modalsContext = createContextId<Signal<State>>('modals.context');

export const initialState: State = {
  active: null,
  modals: {
    mainSidebar: {
      status: 'closed',
    },
    executionSidebar: {
      status: 'closed',
    },
  },
};
