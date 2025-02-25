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

export class DatasetModel extends Model<
  InferAttributes<DatasetModel>,
  InferCreationAttributes<DatasetModel>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare createdBy: string;

  declare columns: NonAttribute<ColumnModel[]>;

  declare createdAt: NonAttribute<Date>;
  declare updatedAt: NonAttribute<Date>;

  declare static associations: {
    columns: Association<DatasetModel, ColumnModel>;
  };
}

DatasetModel.init(
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
    createdBy: {
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

ColumnModel.belongsTo(DatasetModel, {
  targetKey: 'id',
  foreignKey: 'datasetId',
  as: 'dataset',
});
