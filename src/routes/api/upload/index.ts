import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { RequestHandler } from '@builder.io/qwik-city';
import { useServerSession } from '~/state';

export const onPost: RequestHandler = async (ev) => {
  const { request } = ev;
  const session = useServerSession(ev);

  const filename = request.headers.get('X-File-Name')!;
  const chunk = await request.arrayBuffer();

  const chunksDir = join(process.cwd(), '/uploads', session.user.username);
  mkdirSync(chunksDir, { recursive: true });

  const writeStream = createWriteStream(
    join(chunksDir, decodeURIComponent(filename)),
    {
      flags: 'a',
    },
  );

  writeStream.write(Buffer.from(chunk));
  writeStream.end();
};
