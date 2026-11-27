/**
 * 一加 Ace 2 Pro 换电池价格每日监控（Quantumult X [task_local] 定时任务）
 *
 * 部署（按本项目约定）:
 *   1. 在 QX「设置-定时任务」里手动添加（重写引用不会导入 [task_local]）:
 *      0 9 * * * https://raw.githubusercontent.com/weiyongling/weiyongling.github.io/main/qx/oneplus/oneplus_battery_task.js, tag=一加换电池价, enabled=true
 *   2. 或导入同目录的 oneplus_battery.snippet，照抄里面的任务行
 *   3. 本任务是纯网络请求，不需要 MITM、不需要抓 cookie
 *
 * 功能: 每天查一加 Ace 2 Pro 官方换电池价格，与上次对比后推送通知；
 *       查不到明确报价时如实通知，不编造数字。历史记录存 $prefs，保留 30 天。
 *
 * 【改做别的任务】改 CONFIG.sources（URL/请求头）和 parseResult() 的提取规则，
 *   网络请求、历史对比、通知、异常收尾都已封装好。
 * 【QX API】$task.fetch() 请求、$prefs.valueForKey/setValueForKey 持久化、
 *   $notify() 通知、$done() 结束。纯 JSC 语法，不依赖 Node 模块。
 */

'use strict';

var CONFIG = {
  taskName: '一加 Ace 2 Pro 换电池价',
  historyKey: 'qx_oneplus_ace2pro_battery_v1',
  officialUrl: 'https://www.oneplus.com/cn/support',
  priceMin: 50,
  priceMax: 600,
  keepDays: 30,
  sources: [
    {
      name: '百度移动搜索',
      url: 'https://m.baidu.com/s?word=' +
           encodeURIComponent('一加ace2pro换电池官方价格'),
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    },
    {
      name: 'Bing 社区',
      url: 'https://www.bing.com/search?q=' +
           encodeURIComponent('site:bbs.oneplus.com ace2pro 换电池 价格') +
           '&setlang=zh-hans&cc=CN',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    },
    {
      name: '一加官方服务页',
      url: 'https://service.oneplus.com/cn',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }
  ]
};

/* ---------------- 基础工具 ---------------- */

function todayStr() {
  var d = new Date();
  // QX 运行在 iOS，通常已是本地时区；这里统一按 UTC+8 输出日期
  var t = new Date(d.getTime() + 8 * 3600 * 1000);
  var p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return t.getUTCFullYear() + '-' + p(t.getUTCMonth() + 1) + '-' + p(t.getUTCDate()) +
         ' ' + p(t.getUTCHours()) + ':' + p(t.getUTCMinutes());
}

function storeRead(key) {
  try {
    if (typeof $prefs !== 'undefined' && $prefs.valueForKey) return $prefs.valueForKey(key) || '';
  } catch (e) {}
  return '';
}

function storeWrite(key, value) {
  try {
    if (typeof $prefs !== 'undefined' && $prefs.setValueForKey) {
      $prefs.setValueForKey(value, key);
      return true;
    }
  } catch (e) {}
  return false;
}

function notify(title, subtitle, body) {
  try {
    $notify(title, subtitle || '', body || '', { 'open-url': CONFIG.officialUrl });
  } catch (e) {
    console.log('[QX-DAILY] notify failed: ' + JSON.stringify(e));
  }
}

function finish() {
  try { $done({}); } catch (e) { try { $done(); } catch (e2) {} }
}

function fetchText(item) {
  return new Promise(function (resolve, reject) {
    $task.fetch({
      url: item.url,
      method: 'GET',
      headers: item.headers || {}
    }).then(function (resp) {
      var body = resp && resp.body;
      if (typeof body !== 'string') body = JSON.stringify(body || '');
      resolve({ status: resp && resp.statusCode, text: body });
    }, function (err) {
      reject(err);
    });
  });
}

/* ---------------- 结果提取（改任务时主要改这里） ---------------- */

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&yen;|&#165;/g, '¥')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/**
 * 从页面文本里提取"换电池价格"。
 * 策略：找 ¥/￥/元 附近的数字，限定在合理区间；上下文含"电池/官方/换电"加权，
 * 再按 权重×出现次数 取最高分，避免把整机价格或配件价误当作电池价。
 */
function parseResult(text) {
  var clean = stripHtml(text);
  var re = /(?:[¥￥]\s*|价格[^\d]{0,6}|报价[^\d]{0,6})(\d{2,4}(?:\.\d{1,2})?)\s*元?/g;
  var m;
  var scores = {};
  var best = null;

  while ((m = re.exec(clean)) !== null) {
    var v = parseFloat(m[1]);
    if (isNaN(v) || v < CONFIG.priceMin || v > CONFIG.priceMax) continue;
    var ctx = clean.slice(Math.max(0, m.index - 60), m.index + 60);
    var score = 1;
    if (/电池|换电|电芯/.test(ctx)) score += 3;
    if (/官方|售后|维修|备件/.test(ctx)) score += 2;
    if (/更换价格|备件价格|官方报价|更换费用/.test(ctx)) score += 3;
    // 第三方配件/电商报价降权，避免把 ¥145 这类电池商品价当成官方换电价
    if (/第三方|京东|自营|旗舰店|非官方|兼容|品牌电池/.test(ctx)) score -= 4;
    if (score <= 0) continue;
    var key = String(v);
    scores[key] = (scores[key] || 0) + score;
  }

  for (var k in scores) {
    if (!best || scores[k] > scores[best]) best = k;
  }
  return best ? { price: parseFloat(best), score: scores[best] } : null;
}

/* ---------------- 主流程 ---------------- */

async function main() {
  var history = { last: null, records: [] };
  var raw = storeRead(CONFIG.historyKey);
  if (raw) {
    try { history = JSON.parse(raw); } catch (e) {}
  }
  if (!history.records) history.records = [];

  var result = null;
  var usedSource = '';
  var errors = [];

  for (var i = 0; i < CONFIG.sources.length; i++) {
    var src = CONFIG.sources[i];
    try {
      var r = await fetchText(src);
      console.log('[QX-DAILY] ' + src.name + ' HTTP ' + r.status + ' len=' + r.text.length);
      var parsed = parseResult(r.text);
      if (parsed) {
        result = parsed;
        usedSource = src.name;
        break;
      }
      errors.push(src.name + ': 页面无有效价格');
    } catch (e) {
      errors.push(src.name + ': ' + (e && e.error ? e.error : String(e)).slice(0, 60));
    }
  }

  var now = todayStr();

  if (!result) {
    console.log('[QX-DAILY] 未取到价格: ' + errors.join(' | '));
    notify(CONFIG.taskName + '❗', '今日未取到明确报价',
           '数据源均未返回有效价格，请手动查看官方服务页。' + errors[0]);
    finish();
    return;
  }

  var price = result.price;
  var change = '';
  if (history.last && typeof history.last.price === 'number') {
    var diff = price - history.last.price;
    if (diff > 0) change = '较上次上涨 ¥' + diff.toFixed(0);
    else if (diff < 0) change = '较上次下降 ¥' + Math.abs(diff).toFixed(0);
    else change = '较上次持平';
    change += '（' + history.last.date + ' ¥' + history.last.price + '）';
  } else {
    change = '首次记录';
  }

  history.last = { price: price, date: now, source: usedSource };
  history.records.push({ date: now, price: price, source: usedSource });
  if (history.records.length > CONFIG.keepDays) {
    history.records = history.records.slice(-CONFIG.keepDays);
  }
  storeWrite(CONFIG.historyKey, JSON.stringify(history));

  var subtitle = '¥' + price.toFixed(0) + '  ' + change;
  var body = '来源：' + usedSource + '｜' + now + '\n' +
             '官方服务页：' + CONFIG.officialUrl;
  notify(CONFIG.taskName, subtitle, body);
  console.log('[QX-DAILY] ' + subtitle + ' [' + usedSource + ']');
  finish();
}

main().catch(function (err) {
  console.log('[QX-DAILY] 脚本异常: ' + JSON.stringify(err));
  notify(CONFIG.taskName + '❗', '脚本异常', String(err && err.error ? err.error : err));
  finish();
});
