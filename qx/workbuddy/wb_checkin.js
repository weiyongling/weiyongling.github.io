/**
 * WorkBuddy 每日自动签到领积分（Quantumult X [task_local] 定时任务脚本）
 *
 * 接口来自 WorkBuddy 客户端逆向（开源参考 88lin/workbuddy-auto-signin）：
 *   POST {endpoint}/v2/billing/meter/checkin-activity-status   查询签到状态
 *   POST {endpoint}/v2/billing/meter/daily-checkin             领取今日积分
 * 默认 endpoint: https://copilot.tencent.com（抓包 host 为 www.codebuddy.cn 时自动切换）
 *
 * 前置: 先用 wb_get_token.js 重写规则在手机 WorkBuddy App 里抓一次 token，
 *       持久化键 wb_token_v1 会自动生成。之后可禁用重写规则只留本任务。
 *
 * 配置: 在 [task_local] 中加入
 *   10 9 * * * <本文件可访问URL>, tag=WorkBuddy签到, enabled=true
 * 建议每天上午跑一次（积分按 UTC+8 自然日发放）。已签到时接口幂等，不会重复领取。
 */

const TOKEN_KEY = "wb_token_v1";
const DEFAULT_ENDPOINT = "https://copilot.tencent.com";

// ---------- 工具 ----------
function dig(obj, key) {
    // 在可能被 data/result 包裹的响应里找字段（兼容信封结构）
    if (!obj || typeof obj !== "object") return undefined;
    if (key in obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
    const wrappers = ["data", "result", "resp", "response"];
    for (let i = 0; i < wrappers.length; i++) {
        const k = wrappers[i];
        if (obj[k] && typeof obj[k] === "object") {
            const r = dig(obj[k], key);
            if (r !== undefined) return r;
        }
    }
    return undefined;
}

function buildHeaders(capture) {
    const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: capture.token,
        "User-Agent": "WorkBuddy"
    };
    if (capture.uid) headers["X-User-Id"] = capture.uid;
    if (capture.enterpriseId) {
        headers["X-Enterprise-Id"] = capture.enterpriseId;
        headers["X-Tenant-Id"] = capture.enterpriseId;
    } else if (capture.tenantId) {
        headers["X-Tenant-Id"] = capture.tenantId;
    }
    if (capture.domainHeader) headers["X-Domain"] = capture.domainHeader;
    return headers;
}

function post(endpoint, path, headers) {
    return new Promise((resolve, reject) => {
        const t0 = new Date().getTime();
        $task.fetch({
            url: endpoint + path,
            method: "POST",
            headers: headers,
            body: "{}"
        }).then(
            resp => {
                let body;
                try {
                    body = typeof resp.body === "string" ? JSON.parse(resp.body) : resp.body;
                } catch (e) {
                    body = { raw: (resp.body || "").slice(0, 300) };
                }
                resolve({ status: resp.statusCode, body: body, ms: new Date().getTime() - t0 });
            },
            err => reject(err)
        );
    });
}

// ---------- 主流程 ----------
async function checkin() {
    const captureRaw = $prefs.valueForKey(TOKEN_KEY) || "";
    if (!captureRaw) {
        $notify("WorkBuddy 签到❗️", "未获取到 token", "请先开启重写规则，打开 WorkBuddy App 签到页面抓取一次");
        $done();
        return;
    }

    let capture;
    try {
        capture = JSON.parse(captureRaw);
    } catch (e) {
        $notify("WorkBuddy 签到❗️", "token 数据损坏", "请重新抓取一次（开启重写规则并打开 App）");
        $done();
        return;
    }

    const endpoint = capture.host === "www.codebuddy.cn" ? "https://www.codebuddy.cn" : DEFAULT_ENDPOINT;
    const headers = buildHeaders(capture);

    // 1. 查询签到状态
    let scode, sbody;
    try {
        const s = await post(endpoint, "/v2/billing/meter/checkin-activity-status", headers);
        scode = s.status;
        sbody = s.body;
        console.log("[WB] status HTTP " + scode + " cost " + s.ms + "ms");
    } catch (e) {
        console.log("[WB] status error: " + JSON.stringify(e));
        $notify("WorkBuddy 签到❗️", "网络请求失败", "签到跳过，等下次任务自动重试");
        $done();
        return;
    }

    if (scode === 401 || scode === 403) {
        $notify("WorkBuddy 签到❗️", "登录态失效(HTTP " + scode + ")", "请重新开启重写规则抓一次 token");
        $done();
        return;
    }
    if (scode < 200 || scode >= 300) {
        $notify("WorkBuddy 签到❗️", "状态接口异常 HTTP " + scode, JSON.stringify(sbody).slice(0, 100));
        $done();
        return;
    }

    // 活动未开启（非签到季）
    const active = dig(sbody, "active");
    if (active === false) {
        const name = dig(sbody, "activity_name") ? "（" + dig(sbody, "activity_name") + "）" : "";
        $notify("WorkBuddy 签到", "签到活动未开启" + name, "非签到季，无需处理");
        $done();
        return;
    }

    // 今天已签（幂等保护）
    const checked = dig(sbody, "today_checked_in");
    if (checked === true || checked === 1) {
        const streak = dig(sbody, "streak_days");
        const total = dig(sbody, "total_credits");
        const parts = [];
        if (streak) parts.push("连续 " + streak + " 天");
        if (total !== undefined) parts.push("累计 " + total + " 积分");
        $notify("WorkBuddy 签到", "今日已签过✅", parts.join("，"));
        $done();
        return;
    }

    // 2. 领取积分
    let ccode, cbody;
    try {
        const c = await post(endpoint, "/v2/billing/meter/daily-checkin", headers);
        ccode = c.status;
        cbody = c.body;
        console.log("[WB] checkin HTTP " + ccode + " cost " + c.ms + "ms");
    } catch (e) {
        console.log("[WB] checkin error: " + JSON.stringify(e));
        $notify("WorkBuddy 签到❗️", "领取请求失败", "接口幂等，下次运行会自动重领");
        $done();
        return;
    }

    if (ccode === 401 || ccode === 403) {
        $notify("WorkBuddy 签到❗️", "登录态失效(HTTP " + ccode + ")", "请重新抓一次 token");
        $done();
        return;
    }

    // 已签判定（兼容 null / code:10001 / msg 含"已签"）
    const cBodyObj = cbody && typeof cbody === "object" ? cbody : {};
    const cmsg = cBodyObj.msg || "";
    if (cbody === null || cBodyObj.code === 10001 || cmsg.indexOf("已签") >= 0) {
        $notify("WorkBuddy 签到", "今日已签过（服务端判定）✅", "");
        $done();
        return;
    }

    const credit = dig(cbody, "credit");
    if (credit !== undefined) {
        // 领取成功，再查一次拿最新连签/累计
        let tail = "";
        try {
            const s2 = await post(endpoint, "/v2/billing/meter/checkin-activity-status", headers);
            if (s2.status >= 200 && s2.status < 300) {
                const streak = dig(s2.body, "streak_days");
                const total = dig(s2.body, "total_credits");
                const isStreak = dig(s2.body, "is_streak_day");
                if (streak) tail += "，连续 " + streak + " 天";
                if (isStreak) tail += "（连签奖励日）";
                if (total !== undefined) tail += "，累计 " + total + " 积分";
            }
        } catch (e) {}
        $notify("WorkBuddy 签到成功🎉", "+" + credit + " 积分已到账", tail.replace(/^，/, ""));
        console.log("[WB] CLAIMED credit=" + credit + tail);
        $done();
        return;
    }

    if ("code" in cBodyObj || "msg" in cBodyObj) {
        const msg = cBodyObj.msg || ("code " + cBodyObj.code);
        $notify("WorkBuddy 签到❗️", "领取失败: " + msg, "HTTP " + ccode);
        $done();
        return;
    }

    $notify("WorkBuddy 签到❗️", "未识别的返回", JSON.stringify(cbody).slice(0, 120));
    $done();
}

checkin().catch(err => {
    console.log("[WB] 脚本异常: " + JSON.stringify(err));
    $notify("WorkBuddy 签到❗️", "脚本异常", String(err && err.error ? err.error : err));
    $done();
});
