export type ID = 'exportToHub';

export type Status = 'open' | 'closed';

type Modal = {
  status: Status;
};

export type Modals = {
  exportToHub: Modal;
};

export interface State {
  active: ID | null;
  modals: Modals;
}
