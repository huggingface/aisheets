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
        <AddDynamicColumnSidebar onCreateColumn={onCreateColumn} />
      </QwikCityMockProvider>
    </ModalsProvider>,
  );

  expect(fn).not.toHaveBeenCalled();
});

test('should save 10 cells', async () => {
  const add = useAddColumnUseCase();

  const newColumn: CreateColumn = {
    name: 'name',
    type: 'text',
    kind: 'dynamic',
    executionProcess: {
      limit: 10,
      columnsReferences: [],
      modelName: 'modelName',
      offset: 0,
      prompt: 'prompt',
    },
  };

  const columnAdded = await add(newColumn);

  expect(columnAdded).toContain({
    id: columnAdded.id,
    name: 'name',
    type: 'text',
    kind: 'dynamic',
  });
  expect(columnAdded.cells).toHaveLength(10);
});
