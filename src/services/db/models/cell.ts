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
  declare value?: string;
  declare error?: string;
  declare generated: CreationOptional<boolean>;
  declare validated: CreationOptional<boolean>;

  declare createdAt: NonAttribute<Date>;
  declare updatedAt: NonAttribute<Date>;

  declare columnId: ForeignKey<ColumnModel['id']>;
  declare column?: NonAttribute<ColumnModel>;

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
    value: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    error: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    validated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize: db,
    modelName: 'Cell',
  },
);
