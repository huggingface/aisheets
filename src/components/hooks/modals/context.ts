import { type Signal, createContextId } from '@builder.io/qwik';
import type { State } from '~/components/hooks/modals/config';

export const modalsContext = createContextId<Signal<State>>('modals.context');

export const initialState: State = {
  active: null,
  modals: {
    addStaticColumnSidebar: {
      status: 'closed',
      args: null,
    },
    addDynamicColumnSidebar: {
      status: 'closed',
      args: null,
    },
    runExecutionSidebar: {
      status: 'closed',
      args: null,
    },
    exportToHubSidebar: {
      status: 'closed',
      args: null,
    },
  },
};
