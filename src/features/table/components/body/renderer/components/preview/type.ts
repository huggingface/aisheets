import type { Cell, Column } from '~/state';

export interface PreviewProps {
  cell: Cell;
  column: Column;
  value: string;
}
