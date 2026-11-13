/**
 * 淘金币 - 每日自动签到 + 任务（Quantumult X [task_local] 定时任务脚本）
 *
 * 接口体系（淘宝 mtop H5, appKey=12574478, host=h5api.m.taobao.com）:
 *   签到日历:  mtop.coingame.sign.calendar.pure.pc     data {"bizCode":"taoCoin","subBizCode":"coinTown"}
 *   领签到奖:  mtop.coingame.collect.reward.pc        (POST, 同上)
 *   任务面板:  mtop.taobao.pentaprism.scene.query     data {"sceneId":"8676","asac":"2A24A178YUFG02XVGJNZFM"}
 *   做任务:    mtop.taobao.pentaprism.scene.trigger   data {sceneId,deliveryId,implId,asac}
 *   领奖:      mtop.taobao.pentaprism.scene.award     data {activityId,asac,awardIndex,deliveryId,fromToken,implId,samplingRate,sceneId}
 *   逛商品:    mtop.taobao.pc.growth.clickGoodsAd     data {sceneId,deliveryId,implId,asac}
 *   刷token:   mtop.taobao.pc.growth.taocoin.queryusertaocoin
 * 签名: md5("_m_h5_tk前段&t&12574478&data")，_m_h5_tk 取自 cookie。
 *
 * 前置: 用 tb_cookie.js 抓一次 cookie（键 tb_taojinbi_cookie_v1）
 */

const KEY = "tb_taojinbi_cookie_v1";
const APP_KEY = "12574478";
const HOST = "https://h5api.m.taobao.com/h5/";
const PAGE_URL = "https://huodong.taobao.com/wow/z/tbhome/pc-growth/tao-coin";
const REFERER = "https://huodong.taobao.com/";
const ASAC_COIN = "2A24A178YUFG02XVGJNZFM";
const ASAC_CLICK = "2A24904DS0EK51UNN4AEG5";
const SCENE_ID = "8676";

// ---------------- md5（已验证） ----------------
(function (g) {
    function safeAdd(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF); var m = (x >> 16) + (y >> 16) + (l >> 16); return (m << 16) | (l & 0xFFFF); }
    function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
    function cmn(q, a, b, x, s, t) { return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    function binlMD5(x, len) {
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;
        var olda, oldb, oldc, oldd;
        var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
        for (var i = 0; i < x.length; i += 16) {
            olda = a; oldb = b; oldc = c; oldd = d;
            a = ff(a, b, c, d, x[i], 7, -680876936);
            d = ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = ff(a, b, c, d, x[i + 4], 7, -176418897);
            d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
            b = ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = ff(c, d, a, b, x[i + 10], 17, -42063);
            b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
            d = ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
            a = gg(a, b, c, d, x[i + 1], 5, -165796510);
            d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = gg(c, d, a, b, x[i + 11], 14, 643717713);
            b = gg(b, c, d, a, x[i], 20, -373897302);
            a = gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = gg(a, b, c, d, x[i + 9], 5, 568446438);
            d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
            d = gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
            b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
            a = hh(a, b, c, d, x[i + 5], 4, -378558);
            d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
            b = hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
            d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = hh(a, b, c, d, x[i + 13], 4, 681279174);
            d = hh(d, a, b, c, x[i], 11, -358537222);
            c = hh(c, d, a, b, x[i + 3], 16, -722521979);
            b = hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = hh(c, d, a, b, x[i + 15], 16, 530742520);
            b = hh(b, c, d, a, x[i + 2], 23, -995338651);
            a = ii(a, b, c, d, x[i], 6, -198630844);
            d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
            d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
            b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = ii(a, b, c, d, x[i + 4], 6, -145523070);
            d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = ii(b, c, d, a, x[i + 9], 21, -343485551);
            a = safeAdd(a, olda); b = safeAdd(b, oldb);
            c = safeAdd(c, oldc); d = safeAdd(d, oldd);
        }
        return [a, b, c, d];
    }
    function binl2hex(binarray) {
        var hexTab = "0123456789abcdef"; var str = "";
        for (var i = 0; i < binarray.length * 4; i++) {
            str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 15) + hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 15);
        }
        return str;
    }
    function str2binl(str) {
        var bin = []; var mask = 255;
        for (var i = 0; i < str.length * 8; i += 8) bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32);
        return bin;
    }
    g.md5 = function (str) {
        var utf8 = unescape(encodeURIComponent(str));
        return binl2hex(binlMD5(str2binl(utf8), utf8.length * 8));
    };
})(typeof globalThis !== "undefined" ? globalThis : this);

// ---------------- mtop 客户端 ----------------
let COOKIE_STR = "";      // 完整 cookie 串
let COOKIE_MAP = {};      // 解析后

function parseCookie(str) {
    const m = {};
    (str || "").split(";").forEach(p => {
        const i = p.indexOf("=");
        if (i > 0) m[p.slice(0, i).trim()] = p.slice(i + 1).trim();
    });
    return m;
}
function cookieHeader() {
    // 优先用原串（保序），_m_h5_tk 更新后重建
    if (COOKIE_MAP.__rebuilt) {
        return Object.keys(COOKIE_MAP).filter(k => k !== "__rebuilt").map(k => k + "=" + COOKIE_MAP[k]).join("; ");
    }
    return COOKIE_STR;
}
function setToken(tk, tkEnc) {
    if (tk) COOKIE_MAP["_m_h5_tk"] = tk;
    if (tkEnc) COOKIE_MAP["_m_h5_tk_enc"] = tkEnc;
    COOKIE_MAP.__rebuilt = true;
}
function token() { return String(COOKIE_MAP["_m_h5_tk"] || "").split("_")[0]; }

const enc = encodeURIComponent;
const sleep = ms => new Promise(r => setTimeout(r, ms + Math.floor(Math.random() * 400)));

function buildUrl(api, dataStr, t, sign, extra) {
    let qs = "jsv=2.5.1&appKey=" + APP_KEY + "&t=" + t + "&sign=" + sign + "&api=" + enc(api) +
        "&v=1.0&timeout=5000&dataType=jsonp&callback=mtopjsonp1&data=" + enc(dataStr);
    for (const k in (extra || {})) qs += "&" + k + "=" + enc(extra[k]);
    return HOST + api + "/1.0/?" + qs;
}
function parseJsonp(text) {
    text = (text || "").trim();
    const i = text.indexOf("(");
    if (text.indexOf("mtopjsonp") === 0 && i >= 0) text = text.slice(i + 1, text.lastIndexOf(")"));
    return JSON.parse(text);
}
function fetchReq(url, method, body) {
    return new Promise(resolve => {
        $task.fetch({
            url: url, method: method || "GET",
            headers: {
                accept: "*/*",
                "content-type": "application/x-www-form-urlencoded",
                referer: REFERER, origin: "https://huodong.taobao.com",
                "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
                Cookie: cookieHeader()
            },
            body: body
        }).then(r => resolve(r), e => resolve({ statusCode: 0, body: String(e && e.error), headers: {} }));
    });
}
function mtopSign(dataStr) {
    const tk = token();
    if (!tk) throw new Error("cookie 缺少 _m_h5_tk，请重新抓取");
    const t = String(Date.now());
    const sign = md5(tk + "&" + t + "&" + APP_KEY + "&" + dataStr);
    return { t: t, sign: sign };
}
async function mtopGet(api, dataStr, extra, allowRefresh) {
    const s = mtopSign(dataStr);
    const r = await fetchReq(buildUrl(api, dataStr, s.t, s.sign, extra));
    let j = null;
    try { j = parseJsonp(r.body); } catch (e) { j = { ret: ["HTTP_" + r.statusCode + "::" + String(r.body).slice(0, 80)] }; }
    // token 失效 → 刷新一次并重试
    const ret0 = (j.ret && j.ret[0]) || "";
    if (ret0.indexOf("FAIL_SYS_TOKEN") >= 0 && allowRefresh !== false) {
        const got = await refreshTk();
        if (got) return mtopGet(api, dataStr, extra, false);
    }
    return j;
}
async function refreshTk() {
    // 用 queryUserTaoCoin 拉 set-cookie 里的新 token
    const dataStr = "{}";
    const s = mtopSign(dataStr);
    const url = HOST + "mtop.taobao.pc.growth.taocoin.queryusertaocoin/1.0/?jsv=2.5.1&appKey=" + APP_KEY +
        "&t=" + s.t + "&sign=" + s.sign + "&api=mtop.taobao.pc.growth.taocoin.queryusertaocoin&v=1.0" +
        "&dataType=jsonp&callback=mtopjsonp1&data=" + enc(dataStr);
    const r = await fetchReq(url);
    const sc = (r.headers && (r.headers["Set-Cookie"] || r.headers["set-cookie"])) || "";
    const m = sc.match(/_m_h5_tk=([0-9a-f]+_\d+)/);
    const me = sc.match(/_m_h5_tk_enc=([0-9a-f]+)/);
    if (m) {
        setToken(m[1], me ? me[1] : undefined);
        $prefs.setValueForKey(cookieHeader(), KEY); // 持久化新 token
        console.log("[tb] 已刷新 _m_h5_tk");
        return true;
    }
    return false;
}

// ---------------- 签到 ----------------
async function signFlow(lines) {
    const calExtra = { valueType: "original", jsonpIncPrefix: "tbbe", type: "originaljsonp", callback: "mtopjsonptbbe1" };
    const cal = await mtopGet("mtop.coingame.sign.calendar.pure.pc", '{"bizCode":"taoCoin","subBizCode":"coinTown"}', calExtra);
    const today = String(new Date().toISOString().slice(0, 10)).replace(/-/g, "");
    let signed = false, coin = "";
    const jd = (cal && cal.data) || {};
    const walk = o => {
        if (!o || typeof o !== "object") return;
        for (const k in o) {
            const v = o[k];
            if (typeof v === "string" && v.indexOf(today) === 0) {
                if (v.indexOf("_1") > 0 || v.indexOf("_2") > 0) signed = true;
            }
            walk(v);
        }
    };
    walk(jd);
    if (signed) { lines.push("签到: 今日已签✅"); return; }
    const col = await mtopGet("mtop.coingame.collect.reward.pc", '{"bizCode":"taoCoin","subBizCode":"coinTown","page":"pc"}');
    const ok = (col.ret || []).join("").indexOf("SUCCESS") >= 0;
    lines.push("签到: " + (ok ? "成功✅" : (col.ret || []).join("") + " " + ((col.data || {}).resultMessage || "")));
    await sleep(1500);
}

// ---------------- 任务面板 ----------------
function taskList(j) { return ((j.data || {}).model) || []; }
function taskParams(item) {
    let p = item.taskParams || {};
    if (typeof p === "string") { try { p = JSON.parse(p); } catch (e) { p = {}; } }
    if (p && p.deliveryId && p.implId) return p;
    const subs = item.subList || [];
    for (const sub of subs) {
        let sp = sub.taskParams || {};
        if (typeof sp === "string") { try { sp = JSON.parse(sp); } catch (e) { sp = {}; } }
        if (sp.deliveryId && sp.implId) return sp;
    }
    return p;
}
function taskTitle(item) {
    const a = item.assets || {};
    if (a.title) return String(a.title);
    const c = ((item.theme || {}).center) || {};
    if (c.processTitle) return String(c.processTitle);
    const subs = item.subList || [];
    for (const sub of subs) {
        const t2 = taskTitle(sub);
        if (t2 && t2.indexOf("任务") !== 0) return t2;
    }
    return "任务" + (item.id || "?");
}
function progressStatus(item) {
    const pr = item.progress || {};
    return String(pr.status || item.status || "");
}
function isDone(item) {
    if (String(item.complete).toLowerCase() === "true") return true;
    const st = progressStatus(item);
    return ["COMPLETE", "COMPLETED", "DONE", "FINISH"].indexOf(st) >= 0;
}
function isClaimable(item) {
    if (String(item.complete).toLowerCase() === "true") return false;
    const st = progressStatus(item);
    if (["AWARDING", "AWARD"].indexOf(st) >= 0) return true;
    if (st === "COMPLETE" || st === "COMPLETED") return true;
    const btn = String((item.assets || {}).acceptBtn || "");
    return btn.indexOf("领") >= 0;
}
function isPending(item) {
    if (isDone(item)) return false;
    const st = progressStatus(item);
    return ["ACCEPTED", "INIT", ""].indexOf(st) >= 0;
}
function isClickGoods(item) {
    let desc = item.processDesc || ((item.theme || {}).center || {}).processDesc || "";
    if (typeof desc === "string" && desc.charAt(0) === "{") {
        try { desc = JSON.parse(desc); } catch (e) { desc = {}; }
    }
    if (desc && String(desc.type || "").toLowerCase() === "click") return true;
    const u = taskUrl(item);
    if (u.indexOf("product-task") >= 0) return true;
    const title = taskTitle(item);
    return title.indexOf("商品") >= 0 && (title.indexOf("逛") >= 0 || title.indexOf("心仪") >= 0 || title.indexOf("点击") >= 0);
}
function taskUrl(item) {
    const a = item.assets || {};
    return String(a.actionUrl || a.url || (a.link || {}).url || "");
}
function timesInfo(item) {
    const pr = item.progress || {};
    const need = Number(pr.needTimes || 1), times = Number(pr.times || 0);
    return { need: need, done: times, remain: Math.max(1, need - times) };
}
async function queryScene() {
    const data = JSON.stringify({ sceneId: SCENE_ID, asac: ASAC_COIN });
    return mtopGet("mtop.taobao.pentaprism.scene.query", data, {
        type: "jsonp", isSec: "1", secType: "2", pageUrl: PAGE_URL, preventFallback: "true", callback: "mtopjsonp12"
    });
}
async function triggerScene(item) {
    const p = taskParams(item);
    const data = JSON.stringify({
        sceneId: String(p.sceneId || SCENE_ID), deliveryId: String(p.deliveryId || item.id || ""),
        implId: String(p.implId || ""), asac: String(p.asac || ASAC_COIN)
    });
    return mtopGet("mtop.taobao.pentaprism.scene.trigger", data, {
        type: "jsonp", isSec: "1", secType: "2", pageUrl: PAGE_URL, preventFallback: "true", callback: "mtopjsonp1"
    });
}
async function awardScene(item) {
    const p = taskParams(item);
    const data = JSON.stringify({
        activityId: String(p.activityId || ""), asac: String(p.asac || ASAC_COIN),
        awardIndex: String(p.awardIndex || "1"), deliveryId: String(p.deliveryId || item.id || ""),
        fromToken: String(p.fromToken || ""), implId: String(p.implId || ""),
        samplingRate: String(p.samplingRate || "0"), sceneId: String(p.sceneId || SCENE_ID)
    });
    return mtopGet("mtop.taobao.pentaprism.scene.award", data, {
        type: "jsonp", isSec: "1", secType: "2", pageUrl: PAGE_URL, preventFallback: "true", callback: "mtopjsonp1"
    });
}
async function clickGoodsAd(item) {
    const p = taskParams(item);
    const data = JSON.stringify({
        sceneId: String(p.sceneId || SCENE_ID), deliveryId: String(p.deliveryId || item.id || ""),
        implId: String(p.implId || ""), asac: String(p.asac || ASAC_CLICK)
    });
    return mtopGet("mtop.taobao.pc.growth.clickGoodsAd", data, {
        type: "originaljsonp", valueType: "string", isSec: "1", secType: "2",
        pageUrl: "https://huodong.taobao.com/wow/z/tbhome/pc-growth/product-task", preventFallback: "true", callback: "mtopjsonp1"
    });
}
async function visitUrl(url) {
    if (!url || url === "-") return false;
    const r = await fetchReq(url);
    return r.statusCode >= 200 && r.statusCode < 400;
}

// ---------------- 主流程 ----------------
async function main() {
    const lines = [];
    const raw = $prefs.valueForKey(KEY) || "";
    if (!raw || raw.indexOf("_m_h5_tk=") < 0) {
        $notify("淘金币❗️", "未获取到 cookie", "开启抓 cookie 重写，打开手机淘宝-淘金币一次");
        $done(); return;
    }
    COOKIE_STR = raw; COOKIE_MAP = parseCookie(raw);

    // 签到
    await signFlow(lines);
    await sleep(1200);

    // 任务面板
    const q = await queryScene();
    if (!(((q.ret || [])[0] || "").indexOf("SUCCESS") >= 0)) {
        lines.push("任务面板: " + (q.ret || []).join("") + "（可能需重新抓 cookie）");
        $notify("淘金币", "执行结果", lines.join("\n"));
        $done(); return;
    }
    const model = taskList(q);
    const finish = ((q.data || {}).finishCount), total = ((q.data || {}).totalCount) || model.length;
    console.log("[tb] 任务进度 " + finish + "/" + total);

    // 1) 逛商品类
    for (const it of model) {
        if (!isPending(it) || !isClickGoods(it)) continue;
        const info = timesInfo(it);
        lines.push("逛商品[" + taskTitle(it) + "] 需 " + info.need + " 次");
        for (let i = 0; i < info.remain; i++) {
            const r = await clickGoodsAd(it);
            const ok = (((r.ret || [])[0]) || "").indexOf("SUCCESS") >= 0;
            lines.push("  第" + (i + 1) + "次: " + (ok ? "✅" : ((r.ret || [])[0] || "失败")));
            if (!ok) break;
            await sleep(1800);
        }
    }
    // 2) 跳转类：访问页面 → trigger
    for (const it of model) {
        if (!isPending(it) || isClickGoods(it)) continue;
        const title = taskTitle(it);
        const url = taskUrl(it);
        if (url) { await visitUrl(url); await sleep(4000); }
        const r = await triggerScene(it);
        const ok = (((r.ret || [])[0]) || "").indexOf("SUCCESS") >= 0;
        lines.push("任务[" + title + "] trigger " + (ok ? "✅" : ((r.ret || [])[0] || "")));
        await sleep(1800);
    }
    // 3) 再查询 → 领取待领奖
    const q2 = await queryScene();
    if (((q2.ret || [])[0] || "").indexOf("SUCCESS") >= 0) {
        let coinSum = 0;
        for (const it of taskList(q2)) {
            if (!isClaimable(it)) continue;
            const r = await awardScene(it);
            const ok = (((r.ret || [])[0]) || "").indexOf("SUCCESS") >= 0;
            const md = (r.data || {}).model || {};
            let amt = 0;
            const scan = o => { if (!o || typeof o !== "object") return; for (const k in o) { if (/coin|amount|value/i.test(k)) { const n = Number(o[k]); if (!isNaN(n) && n > 0 && n < 10000) amt = Math.max(amt, n); } scan(o[k]); } };
            scan(md);
            coinSum += amt;
            lines.push("领奖[" + taskTitle(it) + "] " + (ok ? "+" + (amt || "?") + " 金币✅" : ((r.ret || [])[0] || "")));
            await sleep(1800);
        }
        if (coinSum) lines.push("本轮领取合计 +" + coinSum + " 金币");
    }
    // 4) 汇总
    const q3 = await queryScene();
    if (((q3.ret || [])[0] || "").indexOf("SUCCESS") >= 0) {
        const d3 = q3.data || {};
        lines.push("任务进度: " + (d3.finishCount) + "/" + (d3.totalCount || taskList(q3).length));
    }
    console.log("[tb] " + lines.join(" | "));
    $notify("淘金币签到任务", "完成✅", lines.slice(0, 6).join("\n"));
    $done();
}

main().catch(e => {
    console.log("[tb] 异常: " + (e && e.message));
    $notify("淘金币❗️", "脚本异常", String(e && e.message).slice(0, 100));
    $done();
});
