import { server$ } from "@builder.io/qwik-city";
import { addColumn } from "~/services";
import { type CreateColumn, type Column } from "~/state";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dynamic: DynamicData,
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

    const column = await addColumn({
      name,
      type,
      kind,
    });

    const cells = [];
    if (kind === "dynamic") {
      const { limit, modelName, offset, prompt } = process!;

      const data = await createDynamicData({
        prompt,
        modelName,
        limit,
        offset,
      });

      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        const cell = await column.createCell({
          idx: i,
          value: row.value,
        });

        cells.push(cell);
      }

      return {
        id: column.id,
        name: column.name,
        type: column.type,
        kind: column.kind,
        cells: cells.map((cell) => ({
          id: cell.id,
          idx: cell.idx,
          value: cell.value,
          error: cell.error,
        })),
        process: {
          modelName,
          prompt,
          offset,
          limit,
        },
      };
    }

    throw new Error("Not implemented static column creation");
  });
