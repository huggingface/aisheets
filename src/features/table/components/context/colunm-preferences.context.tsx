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
  aiButtonHover?: boolean;
  aiTooltipOpen?: boolean;
  aiPromptOpen?: boolean;
}

interface ColumnPreferenceContext {
  preferences: Signal<Record<Column['id'], Pref>>;
  hideTimeouts: Signal<Record<string, number>>;
}

const columnPreferenceContext =
  createContextId<ColumnPreferenceContext>('column-ui.context');

export const ColumnPreferencesProvider = component$(() => {
  useContextProvider(columnPreferenceContext, {
    preferences: useSignal({}),
    hideTimeouts: useSignal({}),
  });

  return <Slot />;
});

export const useColumnsPreference = () => {
  const context = useContext(columnPreferenceContext);
  const columnPreferences = context.preferences;
  const hideTimeouts = context.hideTimeouts;

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
    hoverAiButton: $((columnId: string, hover: boolean) => {
      columnPreferences.value = {
        ...columnPreferences.value,
        [columnId]: {
          ...columnPreferences.value[columnId],
          aiButtonHover: hover,
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

      if (hideTimeouts.value[columnId]) {
        clearTimeout(hideTimeouts.value[columnId]);
        const newTimeouts = { ...hideTimeouts.value };
        delete newTimeouts[columnId];
        hideTimeouts.value = newTimeouts;
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

      if (hideTimeouts.value[columnId]) {
        clearTimeout(hideTimeouts.value[columnId]);
      }

      const timeoutId = window.setTimeout(() => {
        columnPreferences.value = {
          ...columnPreferences.value,
          [columnId]: {
            ...columnPreferences.value[columnId],
            aiButtonVisible: false,
          },
        };

        const newTimeouts = { ...hideTimeouts.value };
        delete newTimeouts[columnId];
        hideTimeouts.value = newTimeouts;
      }, 100);

      hideTimeouts.value = {
        ...hideTimeouts.value,
        [columnId]: timeoutId as unknown as number,
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
          aiButtonHover: false,
          aiTooltipOpen: false,
          aiPromptOpen: false,
          aiButtonVisible: false,
        },
      };
    }),
  };
};
