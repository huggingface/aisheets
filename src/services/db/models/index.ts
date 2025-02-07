import { isDev } from '@builder.io/qwik';
import { db } from '~/services/db';

export * from './dataset';
export * from './column';
export * from './cell';
export * from './process';

await db.sync({ force: isDev });
