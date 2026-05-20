import { request } from '#shared/utils/request';
import { extractWechatBizFromUrl } from '#shared/utils/wechat-url';

interface UrlQuery {
  url: string;
}

export default defineEventHandler(async event => {
  let { url } = getQuery<UrlQuery>(event);
  const fakeid = extractWechatBizFromUrl(url || '');

  const name = await request('/api/web/misc/accountname?url=' + encodeURIComponent(url), {
    headers: {
      Cookie: getHeader(event, 'Cookie') || '',
    },
  }).catch(() => '');

  if (!name && !fakeid) {
    return {
      base_resp: {
        ret: -1,
        err_msg: 'url解析公众号名称失败',
      },
    };
  }

  if (!name && fakeid) {
    return {
      base_resp: {
        ret: 0,
        err_msg: 'ok',
      },
      list: [
        {
          type: 'account',
          alias: '',
          fakeid,
          nickname: fakeid,
          round_head_img: '',
          service_type: 0,
          signature: '通过公众号链接添加',
        },
      ],
      total: 1,
      resolved_fakeid: fakeid,
    };
  }

  const originalResp = await request(`/api/web/mp/searchbiz?keyword=${name}&size=20`, {
    headers: {
      'X-Auth-Key': getHeader(event, 'X-Auth-Key')!,
      Cookie: getHeader(event, 'Cookie')!,
    },
  });
  if (originalResp.base_resp.ret !== 0) {
    return originalResp;
  }

  let resp = JSON.parse(JSON.stringify(originalResp));
  resp.list = resp.list.filter((item: any) => item.nickname === name || (fakeid && item.fakeid === fakeid));
  resp.total = resp.list.length;

  if (resp.list.length === 0) {
    if (fakeid) {
      resp.base_resp.ret = 0;
      resp.base_resp.err_msg = 'ok';
      resp.list = [
        {
          type: 'account',
          alias: '',
          fakeid,
          nickname: name,
          round_head_img: '',
          service_type: 0,
          signature: '通过公众号链接添加',
        },
      ];
      resp.total = 1;
      resp.resolved_fakeid = fakeid;
      resp.resolved_name = name;
      return resp;
    }

    resp.base_resp.ret = -1;
    resp.base_resp.err_msg = '根据解析的名称搜索公众号失败';
    resp.resolved_name = name;
    resp.original_resp = originalResp;
  }

  return resp;
});
