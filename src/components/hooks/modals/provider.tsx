import {
  type Signal,
  Slot,
  component$,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';
import type { State } from '~/components/hooks/modals/config';
import { initialState, modalsContext } from '~/components/hooks/modals/context';

const useModalsProvider = (modals: Signal<State>) => {
  useContextProvider(modalsContext, modals);
};

export const ModalsProvider = component$(() => {
  const internalState = useSignal<State>(initialState);
  useModalsProvider(internalState);

  return <Slot />;
});
