export type ID =
  | 'addStaticColumnSidebar'
  | 'addDynamicColumnSidebar'
  | 'exportToHubSidebar';

export type Status = 'open' | 'closed';

type Modal<A> = {
  status: Status;
  args: A | null;
};

type ModalColumArg = Modal<{ columnId: string; mode: 'create' | 'edit' }>;

export type Modals = {
  addStaticColumnSidebar: ModalColumArg;
  addDynamicColumnSidebar: ModalColumArg;
  exportToHubSidebar: Modal<null>;
};

export interface State {
  active: ID | null;
  modals: Modals;
}
