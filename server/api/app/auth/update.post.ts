import { createError } from 'h3';

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410,
    statusMessage: '密码登录已停用，无法修改账号密码',
  });
});
