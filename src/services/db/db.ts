import { isDev } from '@builder.io/qwik';
import consola from 'consola';
import { Sequelize } from 'sequelize';

// https://sequelize.org/docs/v6/other-topics/typescript/

export const db = new Sequelize({
  storage: ':memory:',
  dialect: 'sqlite',
  logging: (sql) => {
    if (isDev) {
      consola.info(sql.replace('Executing (default):', '🛢️:'));
    }
  },
});

db.beforeInit(async () => {
  try {
    await db.authenticate();
    consola.success('🔌 Connection has been established successfully.');
  } catch (error) {
    consola.error('❌ Unable to connect to the database:', error);
  }

  try {
    await db.sync();
    consola.success('🔁 Database synchronized');
  } catch (error) {
    consola.error('❌ Failed to synchronize database', error);
  }
});
