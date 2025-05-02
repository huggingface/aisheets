import type { NoSerialize, QRL } from '@builder.io/qwik';
import { $, noSerialize, useStore, useTask$ } from '@builder.io/qwik';

export type SerializableState<State, Serializing> = {
  state: State;
  value?: NoSerialize<Serializing>;
};
type InternalSerState<State, Serializing> = SerializableState<
  State,
  Serializing
> & {
  /**
   * A value that will increment whenever the state gets updated.
   * This is used to help track updates to the serializable value.
   * We are assuming that whenever the state updates,
   * the serializable value also has a notable change.
   */
  _updateCount: number;
};

export const makeSerializable = <State extends {}, Serializing extends object>(
  /**
   * This factory should create the nonSerializable value using the given state,
   * and wire up everything needed to update the state when the nonSerializable value updates.
   */
  deserialize: QRL<(state: State) => Serializing>,
) => {
  const getSerializable = $(
    async (serState: SerializableState<State, Serializing>) => {
      const internalSerState = serState as InternalSerState<State, Serializing>;
      if (internalSerState.value) {
        return internalSerState.value;
      }
      const serThing = await deserialize(internalSerState.state);
      internalSerState.value = noSerialize(serThing);
      return internalSerState.value! as Serializing;
    },
  );

  const useSerializable = (state: State, trackedProps?: (keyof State)[]) => {
    const serializableState = useStore<InternalSerState<State, Serializing>>(
      { _updateCount: 0, state },
      { deep: true },
    );
    useTask$(async ({ track }) => {
      if (trackedProps) {
        for (const prop of trackedProps) {
          track(() => serializableState.state[prop]);
        }
      } else {
        track(serializableState.state);
      }
      serializableState.value = noSerialize(
        await getSerializable(serializableState),
      );
      serializableState._updateCount++;
    });
    return serializableState as {
      value: NoSerialize<Serializing>;
      state: State;
    };
  };
  return {
    /**
     * Gets the current serializable value using the given state.
     * If possible, previously created versions of the serializable value will be used.
     */
    getSerializable,
    /**
     * A hook that gets the serializable value. Whenever state updates, it will behave as if the serializable value has updates.
     * If possible, previously created versions of the serializable value will be used.
     * The returned value may be undefined if you try to access it from across a `$` boundary.
     * In those cases, getSerializable should be used instead.
     **/
    useSerializable,
  };
};
