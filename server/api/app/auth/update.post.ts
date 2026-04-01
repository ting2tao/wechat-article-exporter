import { createError, readBody } from 'h3';
import { requireAppSession, updateAppCredentials } from '~/server/utils/app-auth';

interface UpdateCredentialsBody {
  currentPassword?: string;
  username?: string;
  password?: string;
}

export default defineEventHandler(async event => {
  await requireAppSession(event);

  const body = await readBody<UpdateCredentialsBody>(event);
  const currentPassword = body?.currentPassword || '';
  const username = body?.username?.trim() || '';
  const password = body?.password || '';

  if (!currentPassword || !username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: '请完整填写当前密码、新账号和新密码',
    });
  }

  const session = await updateAppCredentials(event, currentPassword, username, password);

  return {
    authenticated: true,
    username: session.username,
  };
});
