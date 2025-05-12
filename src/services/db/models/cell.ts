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

export const MAX_SOURCE_SNIPPET_LENGTH = 300;

export interface CellSource {
  url: string;
  snippet: string;
}

export class ColumnCellModel extends Model<
  InferAttributes<ColumnCellModel>,
  InferCreationAttributes<ColumnCellModel>
> {
  declare id: CreationOptional<string>;
  declare idx: number;

  declare error?: string;
  declare generating: CreationOptional<boolean>;
  declare validated: CreationOptional<boolean>;
  declare sources?: CreationOptional<CellSource[]>;

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
    sources: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    modelName: 'Cell',
  },
);
