import { isDev } from '@builder.io/qwik';
import {
  type CreationOptional,
  DataTypes,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
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
  declare offset: number;
  declare limit: number;

  declare columnId: ForeignKey<ColumnModel['id']>;
}

ProcessModel.init(
  {
    id: {
      type: DataTypes.UUIDV4,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    modelName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prompt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    columnId: {
      type: DataTypes.UUIDV4,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: 'Process',
  },
);

await ProcessModel.sync({ alter: isDev });
