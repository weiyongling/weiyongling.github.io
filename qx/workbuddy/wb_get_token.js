/**
 * WorkBuddy 签到 - 抓取 Token（WorkBuddy App 专用，Quantumult X [rewrite_local] 用）
 *
 * 配置: 在 [rewrite_local] 中加入
 *   ^https?:\/\/(copilot\.tencent\.com|www\.codebuddy\.cn)\/v2\/ url script-request-header <本文件的可访问URL>
 * 并在 [MITM] hostname 中加入 copilot.tencent.com, www.codebuddy.cn
 *
 * 使用: 打开手机 WorkBuddy App 的「Buddy 加油站/签到」页面一次，收到
 *       「token 获取成功✅」通知后，即可禁用(关闭)此重写规则。
 * 存储: 持久化键 wb_token_v1（JSON: token/uid/enterpriseId/...）
 * 说明: 签到脚本 wb_checkin.js 会自动读取该键。
 */

const TOKEN_KEY = "wb_token_v1";

// WorkBuddy 官方接口域名白名单
const ALLOWED_HOSTS = ["copilot.tencent.com", "www.codebuddy.cn"];

function pick(headers, name) {
    return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
}

function main() {
    if (typeof $request === "undefined" || !$request || !$request.url) {
        $done();
        return;
    }

    const headers = $request.headers || {};
    let host = "";
    try {
        host = $request.url.replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
    } catch (e) {
        $done();
        return;
    }
    const path = ($request.url.split("?")[0] || "").toLowerCase();

    // 只在 WorkBuddy 官方域名的 /v2/ 业务接口上取凭证
    if (ALLOWED_HOSTS.indexOf(host) < 0 || path.indexOf("/v2/") < 0) {
        $done();
        return;
    }

    const token = pick(headers, "Authorization");
    if (!token || token.indexOf("Bearer") < 0) {
        $done(); // 无凭证的请求直接放行
        return;
    }

    const capture = {
        url: $request.url,
        host: host,
        token: token,
        uid: pick(headers, "X-User-Id") || "",
        enterpriseId: pick(headers, "X-Enterprise-Id") || "",
        tenantId: pick(headers, "X-Tenant-Id") || "",
        domainHeader: pick(headers, "X-Domain") || "",
        captured_at: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
    };

    const captured = $prefs.valueForKey(TOKEN_KEY) || "";
    $prefs.setValueForKey(JSON.stringify(capture), TOKEN_KEY);

    if (!captured || captured !== JSON.stringify(capture)) {
        $notify("WorkBuddy 签到", "token 获取成功✅", "现在可以禁用此重写规则");
    }
    console.log("[WB] 捕获 host: " + host + "  path: " + path);
    console.log("[WB] Authorization 前缀: " + token.slice(0, 20) + "...");
    $done();
}

main();
