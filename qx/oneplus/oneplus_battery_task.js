/**
 * 一加 Ace 2 Pro 换电池价格每日监控（Quantumult X [task_local] 定时任务）
 *
 * 数据源：OPPO/一加官方备件价格 API（逆向 support.oppo.com 得到，免登录）
 *   POST https://sow-cms.oppo.com/oppo-api/basic/v1/getPartPriceNew
 *   body: {"marketingModelCode":"8db26966a6b84bbebe9dc7a424529faf","regionIsoCode2":"cn"}
 *   返回 data.partPriceList[] 里「电池」分组的 childList：
 *     retailPrice 官方价 / discountRetailPrice 活动价 / laborCostAmount 人工费
 *
 * 部署:
 *   1. QX「设置-定时任务」手动添加（重写引用不会导入 [task_local]）:
 *      0 9 * * * https://raw.githubusercontent.com/weiyongling/weiyongling.github.io/main/qx/oneplus/oneplus_battery_task.js, tag=一加换电池价, enabled=true
 *   2. 或导入同目录 oneplus_battery.snippet 照抄任务行
 *   3. 无需 MITM、无需登录、无需 token
 *
 * 价格规则：总价 = 备件价 + 人工费；活动价（discountRetailPrice）存在时优先用活动价。
 * 历史记录存 $prefs，与上次对比后推送通知，保留 30 天。
 */

'use strict';

var VERSION = '2026-11-27c-official-api';

var CONFIG = {
  taskName: '一加 Ace 2 Pro 换电池价',
  historyKey: 'qx_oneplus_ace2pro_battery_v2',
  api: 'https://sow-cms.oppo.com/oppo-api/basic/v1/getPartPriceNew',
  modelCode: '8db26966a6b84bbebe9dc7a424529faf', // 一加 Ace 2 Pro
  region: 'cn',
  officialUrl: 'https://support.oppo.com/cn/spare-parts-price/#/detail?marketingModelCode=8db26966a6b84bbebe9dc7a424529faf',
  keepDays: 30
};

/* ---------------- 工具 ---------------- */

function todayStr() {
  var d = new Date();
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

function num(v) {
  var n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/**
 * 调官方接口，返回电池条目。
 * 从 partPriceList 的 childList 里找名字精确为「电池」的项（排除电池盖组件）。
 */
function fetchBattery() {
  return new Promise(function (resolve, reject) {
    $task.fetch({
      url: CONFIG.api,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf8',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        marketingModelCode: CONFIG.modelCode,
        regionIsoCode2: CONFIG.region
      })
    }).then(function (resp) {
      var text = resp && resp.body;
      if (typeof text !== 'string') {
        if (text && Object.prototype.toString.call(text) === '[object Array]') {
          var out = '';
          for (var j = 0; j < text.length; j++) out += String.fromCharCode(text[j] & 0xff);
          text = out;
        } else {
          text = JSON.stringify(text || '');
        }
      }
      var json;
      try { json = JSON.parse(text); } catch (e) {
        reject({ error: '响应非 JSON: ' + text.slice(0, 120) });
        return;
      }
      if (String(json.code) !== '1' || !json.data) {
        reject({ error: '接口返回 code=' + json.code + ' msg=' + json.msg });
        return;
      }
      var list = json.data.partPriceList || [];
      var found = null;
      for (var i = 0; i < list.length && !found; i++) {
        var children = list[i].childList || [];
        for (var k = 0; k < children.length; k++) {
          var c = children[k];
          var name = c.partName || c.lv3ClassificationName || '';
          if (name === '电池') { found = c; break; }
        }
      }
      if (!found) {
        reject({ error: '接口未找到电池条目（分组数 ' + list.length + '）' });
        return;
      }
      resolve({
        retail: num(found.retailPrice),
        discount: num(found.discountRetailPrice),
        labor: num(found.laborCostAmount),
        materialCode: found.materialCode || ''
      });
    }, function (err) {
      reject(err);
    });
  });
}

/* ---------------- 主流程 ---------------- */

async function main() {
  console.log('[QX-DAILY] 启动 v' + VERSION);

  var history = { last: null, records: [] };
  var raw = storeRead(CONFIG.historyKey);
  if (raw) {
    try { history = JSON.parse(raw); } catch (e) {}
  }
  if (!history.records) history.records = [];

  var bat;
  try {
    bat = await fetchBattery();
  } catch (e) {
    var msg = e && e.error ? e.error : String(e);
    console.log('[QX-DAILY] 请求失败: ' + msg);
    notify(CONFIG.taskName + '❗', '价格接口请求失败', msg);
    finish();
    return;
  }

  // 活动价存在且 >0 时优先用活动价，否则用官方价；再加人工费
  var partPrice = (bat.discount > 0) ? bat.discount : bat.retail;
  var total = partPrice + bat.labor;
  var isDiscount = bat.discount > 0;

  var priceLine = '¥' + total.toFixed(0) +
    (isDiscount ? '（活动价 ¥' + partPrice.toFixed(0) + ' + 人工 ¥' + bat.labor.toFixed(0) + '）'
                : '（官方价 ¥' + bat.retail.toFixed(0) + ' + 人工 ¥' + bat.labor.toFixed(0) + '）');

  var change = '';
  if (history.last && typeof history.last.price === 'number') {
    var diff = total - history.last.price;
    if (diff > 0) change = '较上次上涨 ¥' + diff.toFixed(0);
    else if (diff < 0) change = '较上次下降 ¥' + Math.abs(diff).toFixed(0);
    else change = '较上次持平';
    change += '（' + history.last.date + ' ¥' + history.last.price.toFixed(0) + '）';
  } else {
    change = '首次记录';
  }

  history.last = { price: total, date: todayStr(), source: 'OPPO官方备件API' };
  history.records.push(history.last);
  if (history.records.length > CONFIG.keepDays) {
    history.records = history.records.slice(-CONFIG.keepDays);
  }
  storeWrite(CONFIG.historyKey, JSON.stringify(history));

  var subtitle = priceLine + '  ' + change;
  var body = '官方价 ¥' + bat.retail.toFixed(0) +
             '｜活动价 ' + (isDiscount ? '¥' + bat.discount.toFixed(0) : '无') +
             '\n人工费 ¥' + bat.labor.toFixed(0) +
             '｜备件编码 ' + bat.materialCode +
             '\n来源：OPPO 官方备件价格接口｜' + todayStr();
  notify(CONFIG.taskName, subtitle, body);
  console.log('[QX-DAILY] ' + subtitle);
  finish();
}

main().catch(function (err) {
  console.log('[QX-DAILY] 脚本异常: ' + JSON.stringify(err));
  notify(CONFIG.taskName + '❗', '脚本异常', String(err && err.error ? err.error : err));
  finish();
});
