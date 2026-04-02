import { proxyMpRequest } from '~/server/utils/proxy-request';

export default defineEventHandler(async event => {
  const { sid } = event.context.params!;

  const body: Record<string, string | number> = {
    userlang: 'zh_CN',
    redirect_url: '',
    login_type: 3,
    sessionid: sid,
    token: '',
    lang: 'zh_CN',
    f: 'json',
    ajax: 1,
  };

  return proxyMpRequest({
    event: event,
    method: 'POST',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/bizlogin',
    query: {
      action: 'startlogin',
    },
    body: body,
    // 新建扫码登录会话时必须从干净上下文开始，不能混入旧公众号 cookie
    cookie: '',
    action: 'start_login', // 有这个标志就会把微信原始响应中的 uuid 这个 set-cookie 传递给客户端，以便后续扫码登录用
  });
});
