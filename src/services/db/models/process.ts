import {
  type Association,
  type CreationOptional,
  DataTypes,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
  type NonAttribute,
} from 'sequelize';

import { db } from '~/services/db';
import type { ColumnModel } from '~/services/db/models/column';

export class ProcessModel extends Model<
  InferAttributes<ProcessModel>,
  InferCreationAttributes<ProcessModel>
> {
  declare id: CreationOptional<string>;
  declare prompt: string;
  declare modelName: string;

  declare modelProvider: string;
  declare endpointUrl: CreationOptional<string | null>;

  declare searchEnabled: boolean;
  declare columnId: ForeignKey<ColumnModel['id']>;

  declare referredColumns: NonAttribute<ColumnModel[]>; // This is a virtual attribute

  declare createdAt: NonAttribute<Date>;
  declare updatedAt: NonAttribute<Date>;

  declare static associations: {
    referredColumns: Association<ProcessModel, ColumnModel>;
  };
}

ProcessModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    prompt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelProvider: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endpointUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    searchEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    columnId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: 'Process',
  },
);
