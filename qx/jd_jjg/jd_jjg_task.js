/**
 * 京东家居馆 - 每日自动做任务领积分（Quantumult X [task_local] 定时任务脚本）
 *
 * 已验证的接口逻辑（与本机逆向脚本 100% 一致，均**无需 h5st 签名**，cookie 鉴权即可）:
 *   jjg_mainPage                查积分/主页        body {"activityId":"4"}
 *   jjg_queryInteractiveInfoV3  查任务列表        body {"activityId":"4","isDistinguishReceivedNewUserAward":false,"reqSource":1}
 *   jjg_doInteractiveAssignment 做任务            body 见 doTask()
 *     - 领取浏览: type=4(BROWSE), actionType=1, 需 ext:{jumpUrl} + 顶层 jumpUrl
 *     - 完成浏览: type=4, actionType=0
 *     - 签到:     type=13(SIGN_IN), actionType=0, itemId 取 ext.sign.itemId
 *   类型规则: 邀请(2)/下单(6)/兑换(30) 一律跳过
 *
 * 前置: 用 jd_jjg_cookie.js 重写抓一次 cookie（键 jd_jjg_cookie_v1）
 * 配置: [task_local] 建议一天跑多于一次（幂等，已完成的任务自动跳过）
 */

const KEY = "jd_jjg_cookie_v1";
const ACTIVITY_ID = "4";
const PROJ_DOTASK = "8HoEASbP7wrRmmLitaDHK1LJEWf";
const PROJ_SIGN = "2e6bqfSg5RhoFXpJC7NmLS6yojHb";

const UA = "jdapp;iPhone;16.1.50;;;M/5.0;appBuild/171135;jdSupportDarkMode/0;lang/zh_CN;ctype/0;site/CN;ccy/CNY;elder/0;ef/1;Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1;";

const sleep = ms => new Promise(r => setTimeout(r, ms + Math.floor(Math.random() * 600)));
const enc = s => encodeURIComponent(s);

let prefsHandle = {}; // cookie 数据

function buildForm(functionId, bodyStr, t) {
    return "functionId=" + enc(functionId) +
        "&body=" + enc(bodyStr) +
        "&appid=home-marketing" +
        "&loginType=2" +
        "&area=" + enc(prefsHandle.area) +
        "&client=apple" +
        "&osVersion=" + enc(prefsHandle.osVersion) +
        "&networkType=wifi&d_model=" + enc(prefsHandle.d_model) +
        "&d_brand=" + enc(prefsHandle.d_brand) +
        "&screen=390*844" +
        "&openudid=" + enc(prefsHandle.openudid) +
        "&clientVersion=" + enc(prefsHandle.clientVersion) +
        "&t=" + t;
}

function api(functionId, bodyObj) {
    const bodyStr = JSON.stringify(bodyObj);
    const t = Date.now();
    const form = buildForm(functionId, bodyStr, t);
    const url = "https://api.m.jd.com/api?functionId=" + enc(functionId) + "&body=" + enc(bodyStr) +
        "&appid=home-marketing&loginType=2&area=" + enc(prefsHandle.area) +
        "&client=apple&osVersion=" + enc(prefsHandle.osVersion) +
        "&networkType=wifi&d_model=" + enc(prefsHandle.d_model) +
        "&d_brand=" + enc(prefsHandle.d_brand) + "&screen=390*844" +
        "&openudid=" + enc(prefsHandle.openudid) +
        "&clientVersion=" + enc(prefsHandle.clientVersion) + "&t=" + t;
    return new Promise(resolve => {
        $task.fetch({
            url: url,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://pro.m.jd.com",
                "Referer": "https://pro.m.jd.com/mall/active/4SitPQagKibGQK1HX7J83sroHj5x/index.html",
                "User-Agent": UA,
                "Cookie": prefsHandle.cookie
            },
            body: form
        }).then(
            resp => {
                let j = null;
                try { j = JSON.parse(resp.body); } catch (e) { }
                resolve({ status: resp.statusCode, json: j, raw: resp.body });
            },
            err => resolve({ status: 0, json: null, raw: String(err && err.error) })
        );
    });
}

function dig(obj, key) {
    if (!obj || typeof obj !== "object") return undefined;
    if (key in obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
    const wrappers = ["data", "result"];
    for (let i = 0; i < wrappers.length; i++) {
        if (obj[wrappers[i]] && typeof obj[wrappers[i]] === "object") {
            const r = dig(obj[wrappers[i]], key);
            if (r !== undefined) return r;
        }
    }
    return undefined;
}

function doTask(id, typeVal, itemId, project, actionType, extra) {
    const body = {
        type: typeVal,
        encryptAssignId: id,
        itemId: String(itemId),
        actionType: actionType === undefined ? 0 : actionType,
        assignId: id,
        encryptProjectId: project,
        activityId: ACTIVITY_ID
    };
    if (extra) {
        for (const k in extra) body[k] = extra[k]; // 顺序略不同不影响JSON解析
    }
    return api("jjg_doInteractiveAssignment", body);
}

function describe(j) {
    if (!j) return "无响应";
    if (j.code === 0 || j.success) return "成功";
    return "code=" + j.code + " " + (j.msg || "");
}

async function queryState() {
    const [tasks, main] = await Promise.all([
        api("jjg_queryInteractiveInfoV3", { activityId: ACTIVITY_ID, isDistinguishReceivedNewUserAward: false, reqSource: 1 }),
        api("jjg_mainPage", { activityId: ACTIVITY_ID })
    ]);
    const list = [];
    const md = dig(tasks.json, "hdInteractiveInfoDtoMap") || {};
    for (const grp in md) {
        const arr = (md[grp] && md[grp].assignmentList) || [];
        for (const a of arr) list.push(a);
    }
    const score = dig(main.json, "availableScore");
    return { list: list, score: score };
}

async function main() {
    const taskLines = [];
    const raw = $prefs.valueForKey(KEY) || "";
    if (!raw) {
        $notify("京东家居馆❗️", "未获取到 cookie", "开启 jd_jjg_cookie 重写规则，打开 App 家居馆活动页一次");
        $done();
        return;
    }
    try {
        prefsHandle = JSON.parse(raw);
    } catch (e) {
        $notify("京东家居馆❗️", "cookie 数据损坏", "重新开启重写规则抓一次 cookie");
        $done();
        return;
    }
    if (!prefsHandle.cookie || prefsHandle.cookie.indexOf("pt_key=") < 0) {
        $notify("京东家居馆❗️", "cookie 缺失凭证", "重新抓一次 cookie");
        $done();
        return;
    }

    const s0 = await queryState();
    if (!s0.list || !s0.list.length) {
        $notify("京东家居馆❗️", "查询任务失败", "可能 cookie 失效，重新抓一次");
        $done();
        return;
    }
    console.log("[jd_jjg] 积分=" + s0.score + " 任务数=" + s0.list.length);

    const SKIP = { 2: "邀请助力", 6: "下单任务", 30: "实物兑换" };

    for (const t of s0.list) {
        if (t.completionFlag) continue;
        const id = t.encryptAssignmentId;

        if (SKIP[t.assignmentType]) {
            taskLines.push("⏭️[" + t.assignmentName + "]" + SKIP[t.assignmentType] + "跳过");
            continue;
        }

        // 签到 (assignmentType=5, proj 2e6b..., 请求 type=13)
        if (t.assignmentType === 5) {
            await sleep(2500);
            const idFromExt = (t.ext && t.ext.sign && t.ext.sign.itemId) || "1";
            const r = await doTask(id, 13, idFromExt, PROJ_SIGN, 0);
            let extra = "";
            const successRewards = (r.json && r.json.data && r.json.data.rewardsInfo && r.json.data.rewardsInfo.successRewards) || {};
            for (const k in successRewards) for (const x of successRewards[k]) extra += " +" + x.quantity + (x.rewardName || "") + (x.rewardDesc ? "(" + x.rewardDesc.trim() + ")" : "");
            taskLines.push("[签到] " + describe(r.json) + extra);
            await sleep(1500);
            continue;
        }

        // 浏览任务 (assignmentType=1, shoppingActivity)
        if (t.assignmentType === 1 && t.ext && t.ext.extraType === "shoppingActivity") {
            const items = (t.ext.shoppingActivity || []);
            const waitMs = ((t.ext.waitDuration || 10) + 1.5) * 1000;
            const limit = Math.min(t.assignmentTimesLimit || 1, items.length || 1);
            let done = t.completionCnt || 0;
            let stop = false;
            for (let round = done; round < (t.assignmentTimesLimit || 1) && !stop; round++) {
                const it = items[(round) % items.length];
                const jump = it.url || "";
                // 1) 领取（actionType=1，需要 ext:{jumpUrl} + 顶层 jumpUrl）
                const r1 = await doTask(id, 4, it.itemId, PROJ_DOTASK, 1, { ext: { jumpUrl: jump }, jumpUrl: jump });
                const j1 = r1.json || {};
                if (j1.code === 103 || (j1.msg || "").indexOf("已完成") >= 0) { taskLines.push("[" + t.assignmentName + "] 已完成✅"); stop = true; break; }
                await sleep(waitMs);
                // 2) 完成（actionType=0）
                const r2 = await doTask(id, 4, it.itemId, PROJ_DOTASK, 0);
                const j2 = r2.json || {};
                if (j2.code === 0) done++;
                taskLines.push("浏览[" + (it.title || t.assignmentName) + "] " + describe(j2));
                if (j2.code === 107 || j2.code === 100001) { stop = true; break; }
                await sleep(2000 + Math.floor(Math.random() * 1200));
            }
            continue;
        }

        taskLines.push("?[" + t.assignmentName + "] 未知类型" + t.assignmentType + "，跳过");
    }

    const s1 = await queryState();
    const doneCount = (s1.list || []).filter(x => x.completionFlag).length;
    const diff = (s1.score || 0) - (s0.score || 0);
    const summary = taskLines.slice(0, 4).join("\n");
    console.log("[jd_jjg] 结果: " + taskLines.join(" | "));
    $notify("京东家居馆" + (diff > 0 ? " +" + diff + "积分 🎉" : ""),
        "积分 " + s0.score + " → " + s1.score + "  已完成 " + doneCount + " 项",
        summary.length ? summary : "本轮无可做任务");
    if (s0.score === undefined) {
        $notify("京东家居馆❗️", "积分查询异常", "可能 cookie 失效，请重新抓取");
    }
    $done();
}

main().catch(e => {
    console.log("[jd_jjg] 异常: " + (e && e.message));
    $notify("京东家居馆❗️", "脚本异常", String(e && e.message));
    $done();
});
