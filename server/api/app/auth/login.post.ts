import { createError } from 'h3';

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410,
    statusMessage: '密码登录已停用，请使用微信扫码登录',
  });
});
