import {
  component$,
  type Signal,
  Slot,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';

import type { Modals } from '~/components/hooks/modals/config';
import { initialState, modalsContext } from '~/components/hooks/modals/context';

const useModalsProvider = (modals: Signal<Modals>) => {
  useContextProvider(modalsContext, modals);
};

export const ModalsProvider = component$(() => {
  const internalState = useSignal<Modals>(initialState);
  useModalsProvider(internalState);

  return <Slot />;
});
