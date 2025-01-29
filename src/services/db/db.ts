import { isDev } from '@builder.io/qwik';
import consola from 'consola';
import { Sequelize } from 'sequelize';

// https://sequelize.org/docs/v6/other-topics/typescript/

const isTest = true; //process.env.NODE_ENV === 'test';

export const db = new Sequelize({
  storage: isTest ? ':memory:' : './.data/db.sqlite',
  dialect: 'sqlite',
  logging: (sql) => {
    if (isDev) {
      consola.info(sql.replace('Executing (default):', '🛢️:'));
    }
  },
});

//TODO: Move to start up method
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
