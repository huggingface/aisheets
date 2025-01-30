import { expect, test, vi } from 'vitest';
import { getColumnById, updateCell } from '~/services';
import { useServerSession } from '~/state';

const testModelName = 'google/gemma-2b-it';
const accessToken = process.env.HF_TOKEN;

// Mock dependencies
vi.mock('~/services', () => ({
  getColumnById: vi.fn(),
  updateCell: vi.fn(),
}));

vi.mock('~/state', () => ({
  useServerSession: vi.fn(),
}));

vi.mock('@builder.io/qwik-city', async () => {
  const actual = await vi.importActual('@builder.io/qwik-city');
  return {
    ...actual,
    server$: vi.fn(
      (fn) =>
        async function* (...args) {
          yield* fn.call({ env: { get: () => accessToken } }, ...args);
        },
    ),
  };
});

test(
  'should stream execution updates',
  async () => {
    // Setup mocks
    const mockColumn = {
      id: '1',
      process: {
        modelName: testModelName,
        prompt: 'Write a greeting',
      },
      cells: [
        { id: '1', value: 'Hello', validated: true },
        { id: '2', value: null, validated: false },
      ],
    };

    (getColumnById as any).mockResolvedValue(mockColumn);
    (useServerSession as any).mockReturnValue({ token: accessToken });
    (updateCell as any).mockResolvedValue(undefined);

    const { useReRunExecution } = await import('./run-execution.usecase');
    const runExecution = useReRunExecution();

    const generator = await runExecution('1');
    const updates: any[] = [];

    for await (const update of generator) {
      updates.push(update);
    }

    expect(updates.length).toBeGreaterThan(1);
    expect(updates[0].done).toBe(false);
    expect(updates[updates.length - 1].done).toBe(true);
    expect(updates[updates.length - 1].cell.value).toBeDefined();
    expect(updateCell).toHaveBeenCalledTimes(1);
  },
  { timeout: 30000 },
);
