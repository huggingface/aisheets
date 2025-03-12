import { ColumnCellModel } from './cell';
import { ColumnModel } from './column';
import { DatasetModel } from './dataset';
import { ProcessModel, ProcessReferredColumnsModel } from './process';

export * from './dataset';
export * from './column';
export * from './cell';
export * from './process';

// Define associations

DatasetModel.hasMany(ColumnModel, {
  sourceKey: 'id',
  foreignKey: 'datasetId',
  as: 'columns',
});

ColumnModel.belongsTo(DatasetModel, {
  targetKey: 'id',
  foreignKey: 'datasetId',
  as: 'dataset',
});

ColumnModel.hasOne(ProcessModel, {
  sourceKey: 'id',
  foreignKey: 'columnId',
  as: 'process',
});

ProcessModel.belongsTo(ColumnModel, {
  foreignKey: 'columnId',
  as: 'column',
});

ProcessModel.belongsToMany(ColumnModel, {
  through: ProcessReferredColumnsModel,
  as: 'referredColumns',
  foreignKey: 'processId',
});
ColumnModel.belongsToMany(ProcessModel, {
  through: ProcessReferredColumnsModel,
  foreignKey: 'columnId',
});

ColumnModel.hasMany(ColumnCellModel, {
  sourceKey: 'id',
  foreignKey: 'columnId',
  as: 'cells',
});

ColumnCellModel.belongsTo(ColumnModel, {
  targetKey: 'id',
  foreignKey: 'columnId',
  as: 'column',
});
