import { createError, readBody } from 'h3';
import { loginWithPassword } from '~/server/utils/app-auth';

interface LoginBody {
  username?: string;
  password?: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<LoginBody>(event);
  const username = body?.username?.trim() || '';
  const password = body?.password || '';

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: '请输入账号和密码',
    });
  }

  const session = await loginWithPassword(event, username, password);

  return {
    authenticated: true,
    username: session.username,
  };
});
