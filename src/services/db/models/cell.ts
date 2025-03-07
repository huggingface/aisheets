import type { ForeignKey, NonAttribute } from 'sequelize';
import {
  type Association,
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';

import { db } from '~/services/db';
import type { ColumnModel } from '~/services/db/models/column';

export class ColumnCellModel extends Model<
  InferAttributes<ColumnCellModel>,
  InferCreationAttributes<ColumnCellModel>
> {
  declare id: CreationOptional<string>;
  declare idx: number;

  declare error?: string;
  declare generating: CreationOptional<boolean>;
  declare validated: CreationOptional<boolean>;

  declare columnId: ForeignKey<ColumnModel['id']>;
  declare column?: NonAttribute<ColumnModel>;

  declare createdAt: NonAttribute<Date>;
  declare updatedAt: NonAttribute<Date>;

  declare static associations: {
    column: Association<ColumnCellModel, ColumnModel>;
  };
}

ColumnCellModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    columnId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    idx: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    error: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    validated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    generating: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize: db,
    modelName: 'Cell',
  },
);
