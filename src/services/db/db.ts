import consola from 'consola';
import { Sequelize } from 'sequelize';
import { SQLITE_DB } from '~/config';

// https://sequelize.org/docs/v6/other-topics/typescript/

export const db = new Sequelize({
  storage: SQLITE_DB,
  dialect: 'sqlite',
  logging: false,
});

db.beforeInit(async () => {
  try {
    await db.authenticate();
    consola.success('🔌 Connection has been established successfully.');
  } catch (error) {
    consola.error('❌ Unable to connect to the database:', error);
  }
});
