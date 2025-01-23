import { server$ } from '@builder.io/qwik-city';

import { addColumn } from '~/services';
import type { Column, CreateColumn } from '~/state';

interface DynamicData {
  modelName: string;
  prompt: string;
  limit: number;
  offset: number;
}

interface DynamicDataResponse {
  value: string;
  error?: string;
}

import { textGeneration } from "@huggingface/inference";


export const createDynamicData = async (
  _dynamic: DynamicData,
): Promise<DynamicDataResponse[]> => {

  const { modelName, prompt, limit } = dynamic;
  
  const values = [];
  for (let i = 0; i < limit; i++) {
    try {
      const response = await textGeneration({
        model: modelName,
        inputs: prompt,
        accessToken: process.env.HF_TOKEN, // From user access token
        parameters: {
          return_full_text: false,
          temperature: 0.7,
          seed: i,
        },
      });
      values.push({
        value: response.generated_text,
      });
    } catch (e) {
      if (e instanceof Error) {
        values.push({
          value: "",
          error: e.message,
        });
      } else {
        values.push({
          value: "",
          error: "Unknown error",
        });
      }
    }
  }
  return Promise.all(values);
};

export const useAddColumnUseCase = () =>
  server$(async (newColum: CreateColumn): Promise<Column> => {
    const { name, type, kind, process } = newColum;

    const column = await addColumn(
      {
        name,
        type,
        kind,
      },
      process,
    );

    if (kind === 'dynamic') {
      const data = await createDynamicData(process!);

      await Promise.all(
        data.map((cell, idx) =>
          column.addCell({
            idx,
            value: cell.value,
            error: cell.error,
          }),
        ),
      );
    } else {
      // Iterate based on quantity of rows.
      for (let idx = 0; idx < 2; idx++) {
        await column.addCell({
          idx,
          value: '',
          error: '',
        });
      }
    }

    return {
      id: column.id,
      name: column.name,
      type: column.type,
      kind: column.kind,
      cells: column.cells.map((cell) => ({
        id: cell.id,
        idx: cell.idx,
        value: cell.value,
        error: cell.error,
      })),
      process: column.process
        ? {
            modelName: column.process.modelName,
            prompt: column.process.prompt,
            limit: column.process.limit,
            offset: column.process.offset,
          }
        : undefined,
    };
  });
