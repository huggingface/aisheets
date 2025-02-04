export type ID =
  | 'addColumnModal'
  | 'addStaticColumnSidebar'
  | 'addDynamicColumnSidebar'
  | 'runExecutionSidebar'
  | 'exportToHubSidebar';

export type Status = 'open' | 'closed';

export type Modals = Record<ID, Status>;
