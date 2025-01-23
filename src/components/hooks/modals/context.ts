import { createContextId, type Signal } from '@builder.io/qwik';

import type { Modals } from '~/components/hooks/modals/config';

export const modalsContext = createContextId<Signal<Modals>>('modals.context');

export const initialState: Modals = {
  addColumnModal: 'closed',
  addStaticColumnSidebar: 'closed',
  addDynamicColumnSidebar: 'closed',
};
