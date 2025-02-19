import { isDev } from '@builder.io/qwik';
import consola from 'consola';
import { Sequelize } from 'sequelize';
import { DATA_DIR } from '~/config';

const env = process.env.NODE_ENV || 'development';

// https://sequelize.org/docs/v6/other-topics/typescript/

export const db = new Sequelize({
  storage: `${DATA_DIR}/${env}.db`,
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
});
