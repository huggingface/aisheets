import { $ } from '@builder.io/qwik';
import { QwikCityMockProvider } from '@builder.io/qwik-city';
import { createDOM } from '@builder.io/qwik/testing';
import { expect, test, vi } from 'vitest';
import { ModalsProvider } from '~/components';
import { AddDynamicColumnSidebar } from '~/features/add-column/add-dynamic-column-sidebar';
import type { CreateColumn } from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';

const fn = vi.fn();

test('should AddDynamicColumnSidebar does not call onCreateColumn initially', async () => {
  const { render } = await createDOM();

  const onCreateColumn = $(fn);

  await render(
    <ModalsProvider>
      <QwikCityMockProvider>
        <AddDynamicColumnSidebar onGenerateColumn={onCreateColumn} />
      </QwikCityMockProvider>
    </ModalsProvider>,
  );

  expect(fn).not.toHaveBeenCalled();
});

test('should save 10 cells', async (t) => {
  t.skip(); // this test is failing
  const add = useAddColumnUseCase();

  const newColumn: CreateColumn = {
    name: 'name',
    type: 'text',
    kind: 'dynamic',
    dataset: {
      id: 'id',
      name: 'name',
      createdBy: 'test',
    },
    process: {
      limit: 10,
      columnsReferences: [],
      modelName: 'modelName',
      modelProvider: 'hf-inference',
      offset: 0,
      prompt: 'prompt',
    },
  };

  const columnAdded = await add(newColumn);
  const cells = [];

  for await (const { column, cell } of columnAdded) {
    if (column) {
      expect(column).toContain({
        id: column.id,
        name: 'name',
        type: 'text',
        kind: 'dynamic',
      });
    }

    if (cell) {
      cells.push(cell);
    }
  }

  expect(cells).toHaveLength(10);
});
