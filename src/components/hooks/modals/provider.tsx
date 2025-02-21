import {
  Slot,
  component$,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';
import type { State } from '~/components/hooks/modals/config';
import { initialState, modalsContext } from '~/components/hooks/modals/context';

export const ModalsProvider = component$(() => {
  const modal = useSignal<State>(initialState);
  useContextProvider(modalsContext, modal);

  return <Slot />;
});
