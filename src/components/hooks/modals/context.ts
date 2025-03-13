import { type Signal, createContextId } from '@builder.io/qwik';
import type { State } from './config';

export const modalsContext = createContextId<Signal<State>>('modals.context');

export const initialState: State = {
  active: null,
  modals: {
    exportToHub: {
      status: 'closed',
    },
    'cell-editor': {
      status: 'closed',
    },
  },
};
