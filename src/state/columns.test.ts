import { describe, expect, test } from 'vitest';
import { type Column, TEMPORAL_ID, canGenerate } from '~/state/columns';

describe('columns', () => {
  describe('canGenerate', () => {
    describe('column with out references columns', () => {
      test('should be false if all cells are not validated', () => {
        const columns: Column[] = [];

        const column: Column = {
          id: TEMPORAL_ID,
          name: 'FAKE COLUMN',
          kind: 'dynamic',
          type: 'text',
          cells: [
            {
              id: TEMPORAL_ID,
              idx: 0,
              validated: false,
              updatedAt: new Date(),
              generated: true,
              value: '',
            },
            {
              id: TEMPORAL_ID,
              idx: 1,
              validated: false,
              updatedAt: new Date(),
              generated: true,
              value: '',
            },
          ],
          process: {
            modelName: '',
            modelProvider: '',
            offset: 0,
            limit: 5,
            prompt: '',
            columnsReferences: [],
            updatedAt: new Date(),
          },
          dataset: {
            id: TEMPORAL_ID,
            name: 'FAKE DATASET',
            createdBy: 'FAKE USER',
          },
        };

        expect(canGenerate(column, columns)).toBeFalsy();
      });

      test('should be true if some validated cells are updated after process execution', () => {
        const columns: Column[] = [];
        const processExecutionUpdatedAt = new Date();
        const cellUpdatedAt = new Date(
          processExecutionUpdatedAt.getTime() + 1000,
        );

        const column: Column = {
          id: TEMPORAL_ID,
          name: 'FAKE COLUMN',
          kind: 'dynamic',
          type: 'text',
          cells: [
            {
              id: TEMPORAL_ID,
              idx: 0,
              validated: true,
              updatedAt: cellUpdatedAt,
              generated: true,
              value: '',
            },
            {
              id: TEMPORAL_ID,
              idx: 1,
              validated: false,
              updatedAt: new Date(),
              generated: true,
              value: '',
            },
          ],
          process: {
            modelName: '',
            modelProvider: '',
            offset: 0,
            limit: 5,
            prompt: '',
            columnsReferences: [],
            updatedAt: processExecutionUpdatedAt,
          },
          dataset: {
            id: TEMPORAL_ID,
            name: 'FAKE DATASET',
            createdBy: 'FAKE USER',
          },
        };

        expect(canGenerate(column, columns)).toBeTruthy();
      });

      test('should be false if all validated cells are updated before process execution', () => {
        const columns: Column[] = [];
        const processExecutionUpdatedAt = new Date();
        const cellUpdatedAt = new Date(
          processExecutionUpdatedAt.getTime() - 1000,
        );

        const column: Column = {
          id: TEMPORAL_ID,
          name: 'FAKE COLUMN',
          kind: 'dynamic',
          type: 'text',
          cells: [
            {
              id: TEMPORAL_ID,
              idx: 0,
              validated: true,
              updatedAt: cellUpdatedAt,
              generated: true,
              value: '',
            },
            {
              id: TEMPORAL_ID,
              idx: 1,
              validated: true,
              updatedAt: cellUpdatedAt,
              generated: true,
              value: '',
            },
          ],
          process: {
            modelName: '',
            modelProvider: '',
            offset: 0,
            limit: 5,
            prompt: '',
            columnsReferences: [],
            updatedAt: processExecutionUpdatedAt,
          },
          dataset: {
            id: TEMPORAL_ID,
            name: 'FAKE DATASET',
            createdBy: 'FAKE USER',
          },
        };

        expect(canGenerate(column, columns)).toBeFalsy();
      });
    });

    describe('column with references columns', () => {
      test('should be false if some cells are validated after process execution but the reference column is dirty', () => {
        const referencedColumnProcessExecution = new Date();
        const referencedCellUpdatedAt = new Date(
          referencedColumnProcessExecution.getTime() + 1000,
        );

        const referencedColumn: Column = {
          id: TEMPORAL_ID,
          name: 'FAKE COLUMN',
          kind: 'dynamic',
          type: 'text',
          cells: [
            {
              id: TEMPORAL_ID,
              idx: 0,
              validated: true,
              updatedAt: referencedCellUpdatedAt,
              generated: true,
              value: '',
            },
            {
              id: TEMPORAL_ID,
              idx: 1,
              validated: true,
              updatedAt: new Date(),
              generated: true,
              value: '',
            },
          ],
          process: {
            modelName: '',
            modelProvider: '',
            offset: 0,
            limit: 5,
            prompt: '',
            columnsReferences: [],
            updatedAt: referencedColumnProcessExecution,
          },
          dataset: {
            id: TEMPORAL_ID,
            name: 'FAKE DATASET',
            createdBy: 'FAKE USER',
          },
        };

        const columns = [referencedColumn];

        const processExecutionUpdatedAt = new Date();
        const cellUpdatedAt = new Date(
          processExecutionUpdatedAt.getTime() + 1000,
        );

        const column: Column = {
          id: TEMPORAL_ID,
          name: 'FAKE COLUMN',
          kind: 'dynamic',
          type: 'text',
          cells: [
            {
              id: TEMPORAL_ID,
              idx: 0,
              validated: true,
              updatedAt: cellUpdatedAt,
              generated: true,
              value: '',
            },
            {
              id: TEMPORAL_ID,
              idx: 1,
              validated: true,
              updatedAt: processExecutionUpdatedAt,
              generated: true,
              value: '',
            },
          ],
          process: {
            modelName: '',
            modelProvider: '',
            offset: 0,
            limit: 5,
            prompt: '',
            columnsReferences: [referencedColumn.id],
            updatedAt: processExecutionUpdatedAt,
          },
          dataset: {
            id: TEMPORAL_ID,
            name: 'FAKE DATASET',
            createdBy: 'FAKE USER',
          },
        };

        expect(canGenerate(column, columns)).toBeFalsy();
      });

      test('should be true if all some are validated after process execution and the reference column is not dirty', () => {
        const referencedColumnProcessExecution = new Date();
        const referencedCellUpdatedAt = new Date(
          referencedColumnProcessExecution.getTime() - 1000,
        );

        const referencedColumn: Column = {
          id: TEMPORAL_ID,
          name: 'FAKE COLUMN',
          kind: 'dynamic',
          type: 'text',
          cells: [
            {
              id: TEMPORAL_ID,
              idx: 0,
              validated: true,
              updatedAt: referencedCellUpdatedAt,
              generated: true,
              value: '',
            },
            {
              id: TEMPORAL_ID,
              idx: 1,
              validated: true,
              updatedAt: new Date(),
              generated: true,
              value: '',
            },
          ],
          process: {
            modelName: '',
            modelProvider: '',
            offset: 0,
            limit: 5,
            prompt: '',
            columnsReferences: [],
            updatedAt: referencedColumnProcessExecution,
          },
          dataset: {
            id: TEMPORAL_ID,
            name: 'FAKE DATASET',
            createdBy: 'FAKE USER',
          },
        };

        const columns = [referencedColumn];

        const processExecutionUpdatedAt = new Date();
        const cellUpdatedAt = new Date(
          processExecutionUpdatedAt.getTime() + 1000,
        );

        const column: Column = {
          id: TEMPORAL_ID,
          name: 'FAKE COLUMN',
          kind: 'dynamic',
          type: 'text',
          cells: [
            {
              id: TEMPORAL_ID,
              idx: 0,
              validated: true,
              updatedAt: cellUpdatedAt,
              generated: true,
              value: '',
            },
            {
              id: TEMPORAL_ID,
              idx: 1,
              validated: true,
              updatedAt: cellUpdatedAt,
              generated: true,
              value: '',
            },
          ],
          process: {
            modelName: '',
            modelProvider: '',
            offset: 0,
            limit: 5,
            prompt: '',
            columnsReferences: [referencedColumn.id],
            updatedAt: processExecutionUpdatedAt,
          },
          dataset: {
            id: TEMPORAL_ID,
            name: 'FAKE DATASET',
            createdBy: 'FAKE USER',
          },
        };

        expect(canGenerate(column, columns)).toBeTruthy();
      });
    });
  });
});
