import { afterEach } from 'vitest';
import {
  ColumnCellModel,
  ColumnModel,
  DatasetModel,
} from '~/services/db/models';

afterEach(async () => {
  await DatasetModel.destroy({ where: {} });
  await ColumnCellModel.destroy({ where: {} });
  await ColumnModel.destroy({ where: {} });
});
