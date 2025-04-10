export type ID = 'exportToHub' | 'mainSidebar';

export type Status = 'open' | 'closed';

type Modal = {
  status: Status;
};

export type Modals = {
  exportToHub: Modal;
  mainSidebar: Modal;
};

export interface State {
  active: ID | null;
  modals: Modals;
}
