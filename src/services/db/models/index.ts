import { db } from '../db';
import * as addSourceUrls from '../migrations/20240320-add-source-urls';
import { ColumnCellModel } from './cell';
import { ColumnModel } from './column';
import { ProcessColumnModel } from './column';
import { DatasetModel } from './dataset';
import { ProcessModel } from './process';

// Run migrations
const runMigrations = async () => {
  try {
    // First sync to create tables if they don't exist
    await db.sync();
    console.log('✅ Database tables created');

    // Then run migrations
    await addSourceUrls.up(db.getQueryInterface());
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Error during database setup:', error);
    throw error;
  }
};

// Initialize database
const initDb = async () => {
  try {
    await db.authenticate();
    console.log('✅ Database connection established');

    // Run migrations and ensure tables exist
    await runMigrations();
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Export models
export {
  DatasetModel,
  ColumnModel,
  ColumnCellModel,
  ProcessModel,
  ProcessColumnModel,
};

// Initialize database
initDb().catch(console.error);
