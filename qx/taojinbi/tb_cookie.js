/**
 * 淘金币 - cookie 自动抓取（Quantumult X [rewrite_local] script-request-header 用）
 *
 * 原理: 拦截手机淘宝/浏览器访问淘金币活动页时发出的 mtop 请求（h5api.m.taobao.com），
 *       取出完整 Cookie（需含 _m_h5_tk / cookie2 / sgcookie / unb 之一即可触发保存），
 *       存入持久化键 tb_taojinbi_cookie_v1，供 tb_task.js 每日签到与做任务使用。
 *
 * 使用: ①重写引用导入片段或手动添加规则并开启 MITM(h5api.m.taobao.com)
 *       ②手机淘宝 → 我的 → 淘金币（金币小镇），等「cookie 获取成功✅」通知
 *       ③cookie 失效时任务脚本会通知重新打开一次
 */

const KEY = "tb_taojinbi_cookie_v1";

function pick(headers, name) {
    return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
}

function main() {
    try {
        if (typeof $request === "undefined" || !$request || !$request.url) { $done(); return; }
        const url = $request.url;
        if (url.indexOf("taobao.com") < 0) { $done(); return; }

        const headers = $request.headers || {};
        const cookie = pick(headers, "Cookie") || "";
        const hasLogin = (cookie.indexOf("cookie2=") >= 0 || cookie.indexOf("unb=") >= 0 || cookie.indexOf("sgcookie=") >= 0) && cookie.length > 200;
        if (!hasLogin) {
            console.log("[tb_cookie] Cookie 缺登录态，跳过");
            $done();
            return;
        }

        const old = $prefs.valueForKey(KEY) || "";
        const newCookie = cookie.replace(/\s/g, " ");
        $prefs.setValueForKey(newCookie, KEY);
        if (old !== newCookie) {
            $notify("淘金币", "cookie 获取成功✅", "脚本会自动换取签名token，无需担心缺失");
        }
        console.log("[tb_cookie] 已保存, 长度 " + newCookie.length);
        $done();
    } catch (e) {
        console.log("[tb_cookie] 异常: " + e);
        $done();
    }
}

main();
