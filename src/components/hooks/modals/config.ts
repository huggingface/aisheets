export type ID =
  | 'addColumnModal'
  | 'addStaticColumnSidebar'
  | 'addDynamicColumnSidebar';

export type Status = 'open' | 'closed';

export type Modals = Record<ID, Status>;
