export type ID =
  | 'addColumnModal'
  | 'addStaticColumnSidebar'
  | 'addDynamicColumnSidebar'
  | 'runExecutionSidebar';

export type Status = 'open' | 'closed';

export type Modals = Record<ID, Status>;
