import { isDev } from '@builder.io/qwik';
import type {
  Association,
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
import { ProcessModel } from '~/services/db/models/process';
//Review the path
import type { Cell, ColumnKind, ColumnType, Process } from '~/state';

export class ColumnModel extends Model<
  InferAttributes<ColumnModel>,
  InferCreationAttributes<ColumnModel>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare type: ColumnType;
  declare kind: ColumnKind;

  declare process: NonAttribute<Process>;
  declare cells: NonAttribute<Cell[]>;

  declare createCell: HasManyCreateAssociationMixin<
    ColumnCellModel,
    'columnId'
  >;

  declare static associations: {
    cells: Association<ColumnModel, ColumnCellModel>;
    process: Association<ColumnModel, ProcessModel>;
  };
}

ColumnModel.init(
  {
    id: {
      type: DataTypes.UUIDV4,
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

await ColumnModel.sync({ alter: isDev });
