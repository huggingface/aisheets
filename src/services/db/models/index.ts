import { db } from '../db';
import { ColumnCellModel } from './cell';
import { ColumnModel } from './column';
import { ProcessColumnModel } from './column';
import { DatasetModel } from './dataset';
import { ProcessModel } from './process';

// Initialize database
const initDb = async () => {
  try {
    await db.authenticate();
    console.log('✅ Database connection established');

    // Sync models and alter tables as needed
    await db.sync({ alter: true });
    console.log('✅ Database models synced');
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
