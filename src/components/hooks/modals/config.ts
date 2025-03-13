export type ID = 'exportToHub' | 'cell-editor';

export type Status = 'open' | 'closed';

type Modal = {
  status: Status;
  args?: unknown;
};

export type Modals = {
  exportToHub: Modal;
  'cell-editor': Modal;
};

export interface State {
  active: ID | null;
  modals: Modals;
}
