export type ID = 'mainSidebar';

export type Status = 'open' | 'closed';

type Modal = {
  status: Status;
};

export type Modals = {
  mainSidebar: Modal;
};

export interface State {
  active: ID | null;
  modals: Modals;
}
