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
import type { ColumnCellModel } from '~/services/db/models/cell';
import type { DatasetModel } from '~/services/db/models/dataset';
import type { ProcessModel } from '~/services/db/models/process';

export class ColumnModel extends Model<
  InferAttributes<ColumnModel>,
  InferCreationAttributes<ColumnModel>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare type: string;
  declare kind: string;
  declare visible: CreationOptional<boolean>;

  declare datasetId: ForeignKey<DatasetModel['id']>;

  declare dataset: NonAttribute<DatasetModel>;
  declare process: NonAttribute<ProcessModel>;
  declare cells: NonAttribute<ColumnCellModel[]>;

  declare createdAt: NonAttribute<Date>;
  declare updatedAt: NonAttribute<Date>;

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
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kind: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    datasetId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: 'columns',
  },
);
