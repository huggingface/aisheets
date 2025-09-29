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
import { type Column, TEMPORAL_ID } from '~/state';

interface Pref {
  width?: number;
  aiButtonVisible?: boolean;
  aiTooltipOpen?: boolean;
  aiPromptOpen?: boolean;
}

const columnPreferenceContext =
  createContextId<Signal<Record<Column['id'], Pref>>>('column-ui.context');

export const ColumnPreferencesProvider = component$(() => {
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
          ...columnPreferences.value[columnId],
          width,
        },
      };
    }),
    showAiButton: $((columnId: string) => {
      if (columnId === TEMPORAL_ID) return;
      if (
        Object.values(columnPreferences.value).some(
          (pref) => !!pref.aiPromptOpen,
        )
      ) {
        return;
      }

      columnPreferences.value = {
        ...columnPreferences.value,
        [columnId]: {
          ...columnPreferences.value[columnId],
          aiButtonVisible: true,
        },
      };
    }),
    hideAiButton: $((columnId: string) => {
      if (
        Object.values(columnPreferences.value).some(
          (pref) => !!pref.aiPromptOpen,
        )
      ) {
        return;
      }

      columnPreferences.value = {
        ...columnPreferences.value,
        [columnId]: {
          ...columnPreferences.value[columnId],
          aiButtonVisible: false,
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
          aiButtonVisible: false,
        },
      };
    }),
  };
};
