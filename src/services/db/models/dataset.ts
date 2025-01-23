import { isDev } from '@builder.io/qwik';
import {
  type Association,
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
  type NonAttribute,
} from 'sequelize';

import { db } from '~/services/db';
import { ColumnModel } from '~/services/db/models/column';
//Review the path
import type { Column } from '~/state';

export class DatasetModel extends Model<
  InferAttributes<DatasetModel>,
  InferCreationAttributes<DatasetModel>
> {
  declare id: CreationOptional<string>;
  declare name: string;

  declare columns: NonAttribute<Column[]>;

  // declare createColumn: HasManyCreateAssociationMixin<ColumnModel, "datasetId">;

  declare static associations: {
    columns: Association<DatasetModel, ColumnModel>;
  };
}

DatasetModel.init(
  {
    id: {
      type: DataTypes.UUIDV4,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: 'Dataset',
  },
);

DatasetModel.hasMany(ColumnModel, {
  sourceKey: 'id',
  foreignKey: 'datasetId',
  as: 'columns',
});

await DatasetModel.sync({ alter: isDev });
