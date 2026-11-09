/**
 * 京东家居馆 - cookie 自动抓取（Quantumult X [rewrite_local] script-request-header 用）
 *
 * 原理: 拦截手机京东 App 访问家居馆活动时发出的 jjg_ 系列请求（api.m.jd.com），
 *       从请求头取出完整 Cookie（含 pt_key/pt_pin 等），并从 URL 收集
 *       area/openudid/ep 等设备参数，存入持久化键 jd_jjg_cookie_v1。
 *
 * 使用: ①重写引用导入片段或手动添加 rewrite 规则并开启 MITM(api.m.jd.com)
 *       ②手机打开 京东 App → 进入「京东家居馆」活动页面（任务列表加载出来即可）
 *       ③收到「cookie 获取成功✅」通知后，可单条禁用本重写规则
 * cookie 失效时 jd_jjg_task.js 会通知你重新开启该规则抓一次。
 * 注意: 本脚本写的是登录凭证，切勿把持久化内容公开分享。
 */

const KEY = "jd_jjg_cookie_v1";
const FX_DAYS = "jd_jjg_cookie_v1";

function pick(headers, name) {
    return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
}

function main() {
    try {
        if (typeof $request === "undefined" || !$request || !$request.url) { $done(); return; }
        const url = $request.url;
        if (url.indexOf("api.m.jd.com") < 0 || url.indexOf("jjg_") < 0) { $done(); return; }

        const headers = $request.headers || {};
        const cookie = pick(headers, "Cookie") || "";
        if (cookie.indexOf("pt_key=") < 0 || cookie.indexOf("pt_pin=") < 0) {
            console.log("[jd_jjg_cookie] 该请求 Cookie 不含登录凭证，跳过");
            $done();
            return;
        }

        // 从 URL 收集设备参数（做任务请求要用）
        const qs = url.split("?")[1] || "";
        const q = {};
        qs.split("&").forEach(p => {
            const i = p.indexOf("=");
            if (i > 0) q[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
        });

        const capture = {
            cookie: cookie,
            area: q.area || "",
            openudid: q.openudid || "",
            osVersion: q.osVersion || "",
            d_model: q.d_model || "",
            d_brand: q.d_brand || "",
            clientVersion: q.clientVersion || "16.1.50",
            captured_at: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
        };

        const old = $prefs.valueForKey(KEY) || "";
        const json = JSON.stringify(capture);
        $prefs.setValueForKey(json, KEY);

        if (old !== json) {
            $notify("京东家居馆", "cookie 获取成功✅", "现在不影响日常使用，可保持重写开启");
        }
        console.log("[jd_jjg_cookie] 已保存 cookie(长度 " + cookie.length + ") area=" + capture.area);
        $done();
    } catch (e) {
        console.log("[jd_jjg_cookie] 异常: " + e);
        $done();
    }
}

main();
