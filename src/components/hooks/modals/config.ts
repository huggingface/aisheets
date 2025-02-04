export type ID =
  | 'addStaticColumnSidebar'
  | 'addDynamicColumnSidebar'
  | 'runExecutionSidebar';

export type Status = 'open' | 'closed';

type Modal<A> = {
  status: Status;
  args: A | null;
};

type ModalColumArg = Modal<{ columnId: string }>;

export type Modals = {
  addStaticColumnSidebar: ModalColumArg;
  addDynamicColumnSidebar: ModalColumArg;
  runExecutionSidebar: ModalColumArg;
};

export interface State {
  active: ID | null;
  modals: Modals;
}
