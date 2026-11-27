/**
 * OPPO / 一加服务站点 登录凭证抓取（Quantumult X [rewrite_local] 脚本）
 *
 * 逆向来源：support.oppo.com 的 spareParts chunk（oppo-global-service）。
 * 登录后页面通过 HeytapJsApi.getToken() 拿到 token，拼成：
 *   Authorization: cms_token=<token>; cms_imei=<...>; cms_clientIp=<...>
 * 并随业务请求发往 sow-cms.oppo.com/oppo-api。本脚本拦截该请求头并持久化。
 *
 * 【重要】备件价格查询接口（basic/v1/getPartPriceNew）是免登录的，
 *         查换电池价格无需本脚本。本脚本只为其它需要登录态的接口
 *         （服务记录 / 会员权益 / 优惠券等）准备，按需启用重写规则即可。
 *
 * 部署：
 *   1. [rewrite_local] 加一行（见 oppo_token.snippet），MITM hostname 加
 *      sow-cms.oppo.com, support.oppo.com
 *   2. 手机浏览器/OPPO服务页登录一次账号
 *   3. 收到「OPPO token 获取成功✅」通知后，可禁用这条重写规则
 *   4. 凭证存 $prefs 键 oppo_auth_v1（JSON: authorization / cookies / 时间）
 *
 * 说明：只抓 OPPO 官方域名的请求头，不记录密码；凭证仅存在本机 QX。
 */

'use strict';

var STORE_KEY = 'oppo_auth_v1';
var ALLOW_HOSTS = ['sow-cms.oppo.com', 'support.oppo.com', 'service.oneplus.com'];

function pick(headers, name) {
  if (!headers) return '';
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function hostOf(url) {
  try {
    return String(url || '').replace(/^https?:\/\//, '').split('/')[0].replace(/:\d+$/, '').toLowerCase();
  } catch (e) {
    return '';
  }
}

function main() {
  if (typeof $request === 'undefined' || !$request || !$request.url) {
    $done();
    return;
  }
  var host = hostOf($request.url);
  if (ALLOW_HOSTS.indexOf(host) < 0) {
    $done();
    return;
  }

  var headers = $request.headers || {};
  // 优先取 Authorization（含 cms_token）；没有时退而取 cookie 中的关键字段
  var authorization = pick(headers, 'Authorization');
  var cookie = pick(headers, 'Cookie') || pick(headers, 'cookie');
  var pagePath = pick(headers, 'Page-Path');
  var hasAuth = /cms_token|token=/i.test(authorization) || /cms_token|TOKENSID|newopkey/i.test(cookie);

  if (!hasAuth) {
    $done(); // 未登录态，直接放行不记录
    return;
  }

  var capture = {
    authorization: authorization,
    cookie: cookie,
    pagePath: pagePath || '',
    host: host,
    captured_at: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  };

  var old = '';
  try {
    if (typeof $prefs !== 'undefined' && $prefs.valueForKey) old = $prefs.valueForKey(STORE_KEY) || '';
  } catch (e) {}

  var json = JSON.stringify(capture);
  try {
    if (typeof $prefs !== 'undefined' && $prefs.setValueForKey) $prefs.setValueForKey(json, STORE_KEY);
  } catch (e) {
    console.log('[OPPO-TOKEN] 存储失败: ' + JSON.stringify(e));
    $done();
    return;
  }

  if (old !== json) {
    try {
      $notify('OPPO token 获取成功✅', host, '凭证已存 ' + STORE_KEY + '，可禁用此重写规则');
    } catch (e) {}
    console.log('[OPPO-TOKEN] 已捕获 ' + host + ' Authorization 长度 ' + authorization.length);
  }
  $done();
}

main();
