import consola from 'consola';
import { Sequelize } from 'sequelize';
import { appConfig } from '~/config';

// https://sequelize.org/docs/v6/other-topics/typescript/

const {
  data: { sqliteDb },
} = appConfig;

export const db = new Sequelize({
  storage: sqliteDb,
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
