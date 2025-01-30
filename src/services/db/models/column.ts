import { isDev } from '@builder.io/qwik';
import type {
  Association,
  ForeignKey,
  HasManyCreateAssociationMixin,
  NonAttribute,
} from 'sequelize';
import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';

import { db } from '~/services/db';
import { ColumnCellModel } from '~/services/db/models/cell';
import type { DatasetModel } from '~/services/db/models/dataset';
import { ProcessModel } from '~/services/db/models/process';

export class ColumnModel extends Model<
  InferAttributes<ColumnModel>,
  InferCreationAttributes<ColumnModel>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare type: string;
  declare kind: string;

  declare datasetId: ForeignKey<DatasetModel['id']>;

  declare dataset: NonAttribute<DatasetModel>;
  declare process: NonAttribute<ProcessModel>;
  declare cells: NonAttribute<ColumnCellModel[]>;

  declare createCell: HasManyCreateAssociationMixin<
    ColumnCellModel,
    'columnId'
  >;

  declare static associations: {
    cells: Association<ColumnModel, ColumnCellModel>;
    dataset: Association<ColumnModel, DatasetModel>;
    process: Association<ColumnModel, ProcessModel>;
  };
}

ColumnModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kind: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    datasetId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: 'Column',
  },
);

ColumnModel.hasMany(ColumnCellModel, {
  sourceKey: 'id',
  foreignKey: 'columnId',
  as: 'cells',
});

ColumnCellModel.belongsTo(ColumnModel, {
  foreignKey: 'columnId',
  as: 'column',
});

ColumnModel.hasOne(ProcessModel, {
  sourceKey: 'id',
  foreignKey: 'columnId',
  as: 'process',
});

export const ProcessColumnModel = db.define('ProcessColumn', {
  processId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: ProcessModel,
      key: 'id',
    },
  },
  columnId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: ColumnModel,
      key: 'id',
    },
  },
});

ProcessModel.belongsToMany(ColumnModel, {
  through: ProcessColumnModel,
  as: 'referredColumns',
  foreignKey: 'processId',
});
ColumnModel.belongsToMany(ProcessModel, {
  through: ProcessColumnModel,
  foreignKey: 'columnId',
});

await ProcessColumnModel.sync({ alter: isDev });
await ColumnModel.sync({ alter: isDev });
