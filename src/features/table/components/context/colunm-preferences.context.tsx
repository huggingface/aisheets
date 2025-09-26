import {
  $,
  component$,
  createContextId,
  type Signal,
  Slot,
  useContext,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';
import type { Column } from '~/state';

interface Pref {
  width?: number;
  aiTooltipOpen?: boolean;
  aiPromptOpen?: boolean;
}

const columnPreferenceContext =
  createContextId<Signal<Record<Column['id'], Pref>>>('column-ui.context');

export const ColumnSizeProvider = component$(() => {
  useContextProvider(columnPreferenceContext, useSignal({}));

  return <Slot />;
});

export const useColumnsPreference = () => {
  const columnPreferences = useContext(columnPreferenceContext);

  return {
    columnPreferences,
    resize: $((columnId: string, width: number) => {
      columnPreferences.value = {
        ...columnPreferences.value,
        [columnId]: {
          width,
        },
      };
    }),
    openAiColumn: $((columnId: string) => {
      columnPreferences.value = {
        ...columnPreferences.value,
        [columnId]: {
          ...columnPreferences.value[columnId],
          aiTooltipOpen: true,
        },
      };
    }),
    closeAiColumn: $((columnId: string) => {
      columnPreferences.value = {
        ...columnPreferences.value,
        [columnId]: {
          ...columnPreferences.value[columnId],
          aiTooltipOpen: false,
        },
      };
    }),
    openAiPrompt: $((columnId: string) => {
      columnPreferences.value = {
        ...columnPreferences.value,
        [columnId]: {
          ...columnPreferences.value[columnId],
          aiPromptOpen: true,
        },
      };
    }),
    closeAiPrompt: $((columnId: string) => {
      columnPreferences.value = {
        ...columnPreferences.value,
        [columnId]: {
          ...columnPreferences.value[columnId],
          aiPromptOpen: false,
        },
      };
    }),
  };
};
