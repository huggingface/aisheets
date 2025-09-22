export type ID = 'mainSidebar' | 'executionSidebar';

export type Status = 'open' | 'closed';

type Modal = {
  status: Status;
};

export type Modals = {
  mainSidebar: Modal;
  executionSidebar: Modal;
};

export interface State {
  active: ID | null;
  modals: Modals;
}
