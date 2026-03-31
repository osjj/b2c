'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type ScraperStatus = {
  hasCookie: boolean
  cookiePreview: string
  cookieSource: 'database' | 'env' | 'none'
  apiKey: string
}

function buildUserscript(apiKey: string, appUrl: string): string {
  return `// ==UserScript==
// @name         店铺商品采集（1688 / Alibaba）
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  在 1688 或 Alibaba 商品页一键采集数据到店铺后台
// @author       store-admin
// @match        https://detail.1688.com/offer/*.html
// @match        https://detail.1688.com/offer/*
// @match        https://www.alibaba.com/product-detail/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      ${new URL(appUrl).hostname}
// ==/UserScript==

(function () {
  'use strict';

  const STORE_URL = '${appUrl}';
  const API_KEY = '${apiKey}';
  const SITE = location.hostname.includes('alibaba.com') ? 'alibaba' : '1688';

  // ─── UI ─────────────────────────────────────────────────────────────────────
  GM_addStyle(\`
    #__scraper_panel__ {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,.15); padding: 16px; width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px; line-height: 1.5;
    }
    #__scraper_panel__ h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; }
    #__scraper_panel__ .site-badge {
      display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 4px;
      background: #f3f4f6; color: #6b7280; margin-bottom: 10px;
    }
    #__scraper_btn__ {
      width: 100%; padding: 8px; background: #1a1a1a; color: #fff;
      border: none; border-radius: 8px; cursor: pointer; font-size: 13px;
      font-weight: 500; transition: opacity .15s;
    }
    #__scraper_btn__:disabled { opacity: .5; cursor: not-allowed; }
    #__scraper_status__ { margin-top: 10px; min-height: 20px; color: #6b7280; }
    #__scraper_status__.ok { color: #16a34a; }
    #__scraper_status__.err { color: #dc2626; }
  \`);

  const panel = document.createElement('div');
  panel.id = '__scraper_panel__';
  panel.innerHTML = \`
    <h4>🛍 店铺采集</h4>
    <span class="site-badge">\${SITE === 'alibaba' ? 'Alibaba.com' : '1688.com'}</span>
    <button id="__scraper_btn__">采集当前商品</button>
    <div id="__scraper_status__">就绪</div>
  \`;
  document.body.appendChild(panel);

  const btn = document.getElementById('__scraper_btn__');
  const statusEl = document.getElementById('__scraper_status__');

  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = cls || '';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1688.com 提取函数
  // ═══════════════════════════════════════════════════════════════════════════

  function _1688_getOfferId() {
    const m = location.href.match(/\\/offer\\/(\\d+)/);
    return m ? m[1] : '';
  }

  function _1688_getName() {
    const el = document.querySelector('.module-od-title');
    if (el && el.textContent.trim()) return el.textContent.trim();
    const meta = document.querySelector('meta[property="og:title"]');
    return meta ? meta.getAttribute('content').trim() : '';
  }

  function _1688_getDescription() {
    const meta = document.querySelector('meta[name="description"]');
    return meta ? meta.getAttribute('content').trim() : '';
  }

  function _1688_getPriceData() {
    const priceTiers = [];
    const priceText = document.querySelector('.module-od-main-price')?.innerText || '';
    const lines = priceText.split('\\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const qtyMatch = line.match(/(\\d+)\\s*[件个条\\-+~～]/);
      const priceMatch = line.match(/[¥￥]\\s*([\\d.]+)/);
      if (qtyMatch && priceMatch) {
        priceTiers.push({ minQuantity: parseInt(qtyMatch[1]), price: parseFloat(priceMatch[1]) });
      }
    }
    priceTiers.sort((a, b) => a.minQuantity - b.minQuantity);
    for (let i = 0; i < priceTiers.length - 1; i++) {
      priceTiers[i].maxQuantity = priceTiers[i + 1].minQuantity - 1;
    }
    const allPrices = [...priceText.matchAll(/[¥￥]\\s*([\\d.]+)/g)].map(m => parseFloat(m[1]));
    const price = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    return { price, priceTiers };
  }

  function _1688_getVariants() {
    const variants = [];
    const groups = document.querySelectorAll('.module-od-sku-selection .feature-item');
    for (const group of groups) {
      const name = group.querySelector('.feature-item-label h3')?.textContent.trim();
      if (!name) continue;
      const options = [];
      for (const optEl of group.querySelectorAll('.expand-view-item')) {
        const value = optEl.innerText.trim().split('\\n')[0];
        if (!value) continue;
        const imgSrc = optEl.querySelector('img.ant-image-img')?.src;
        options.push({ value, imageUrl: imgSrc || undefined });
      }
      if (options.length > 0) variants.push({ name, options });
    }
    return variants;
  }

  function _1688_getSpecifications() {
    const specs = {};
    const rows = document.querySelectorAll('.module-od-product-attributes tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const key = cells[0].innerText.trim();
        const val = cells[1].innerText.trim();
        if (key && val) specs[key] = val;
      }
    }
    if (Object.keys(specs).length === 0) {
      const items = document.querySelectorAll('.module-od-product-attributes [class*="item"], .module-od-product-attributes li');
      for (const item of items) {
        const text = item.innerText.trim();
        const parts = text.split(/[:：]/);
        if (parts.length >= 2) {
          specs[parts[0].trim()] = parts.slice(1).join(':').trim();
        }
      }
    }
    return specs;
  }

  function _1688_getMainImages() {
    const srcs = [...document.querySelectorAll('img.od-gallery-img')]
      .map(img => img.src)
      .filter(src => src && src.includes('alicdn.com') && src.includes('cib.jpg'));
    return [...new Set(srcs.map(src => src.replace(/_b\\.jpg$/, '')))];
  }

  // 1688 ICOSS 详情图：页面加载时立即监听
  let _icossResolve;
  const _icossPromise = new Promise(resolve => { _icossResolve = resolve; });
  if (SITE === '1688') {
    (function () {
      function fetchIcoss(url) {
        fetch(url).then(r => r.text()).then(text => _icossResolve(text)).catch(() => _icossResolve(null));
      }
      function isIcossUrl(url) {
        return (url.includes('itemcdn.tmall.com') || url.includes('itemcdn.tbcdn.cn')) && url.includes('1688offer');
      }
      try {
        const obs = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (isIcossUrl(entry.name)) { obs.disconnect(); fetchIcoss(entry.name); return; }
          }
        });
        obs.observe({ type: 'resource', buffered: true });
      } catch (e) {
        const entry = performance.getEntriesByType('resource').find(r => isIcossUrl(r.name));
        if (entry) fetchIcoss(entry.name); else _icossResolve(null);
      }
      setTimeout(() => _icossResolve(null), 15000);
    })();
  } else {
    _icossResolve(null);
  }

  function _1688_getDetailImages() {
    return _icossPromise.then(text => {
      if (!text) return [];
      const match = text.match(/var\\s+offer_details\\s*=\\s*(\\{[\\s\\S]*\\})/);
      if (!match) return [];
      try {
        const data = JSON.parse(match[1]);
        const content = data.content || '';
        const imgPattern = /src="(https?:\\/\\/[^"]+\\.(jpg|jpeg|png|webp|gif)[^"]*)"/gi;
        return [...new Set([...content.matchAll(imgPattern)].map(m => m[1].split('?')[0]))];
      } catch { return []; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Alibaba.com 提取函数
  // ═══════════════════════════════════════════════════════════════════════════

  // 从 schema.org JSON-LD 获取结构化数据（最可靠，Alibaba 页面标准注入）
  function _alibaba_getSchemaData() {
    try {
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
        const items = [].concat(JSON.parse(s.textContent || '{}'));
        const product = items.find(i => i['@type'] === 'Product');
        if (product) return product;
      }
    } catch {}
    return null;
  }

  // 从 window.detailData.globalData 获取 variants/specs 等扩展数据
  function _alibaba_getGlobalData() {
    try {
      return window.detailData?.globalData || null;
    } catch {}
    return null;
  }

  function _alibaba_getOfferId() {
    const m = location.href.match(/_([0-9]+)\\.html/);
    return m ? m[1] : '';
  }

  function _alibaba_getName(schema, gd) {
    // schema.org 最可靠
    if (schema?.name) return String(schema.name).trim();
    // detailData.globalData.product.subject
    const subject = gd?.product?.subject || gd?.subject;
    if (subject) return String(subject).trim();
    // DOM 降级
    return document.querySelector('h1')?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim()
      || '';
  }

  function _alibaba_getDescription(schema, gd) {
    if (schema?.description) return String(schema.description).trim();
    const desc = gd?.description || gd?.pdp?.description;
    if (desc) return String(desc).replace(/<[^>]+>/g, '').trim();
    return document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
  }

  function _alibaba_getPriceData(schema, gd) {
    const priceTiers = [];
    // detailData.globalData.product.price 里找阶梯价
    const priceList = gd?.product?.price?.priceList || gd?.product?.price || [];
    for (const tier of priceList) {
      const minQty = parseInt(tier.beginAmount || tier.startAmount || tier.minQuantity || 1);
      const maxQty = tier.endAmount ? parseInt(tier.endAmount) : undefined;
      const price = parseFloat(tier.price || tier.unitPrice || 0);
      if (price > 0) priceTiers.push({ minQuantity: minQty, maxQuantity: maxQty, price });
    }
    if (priceTiers.length > 0) {
      return { price: Math.min(...priceTiers.map(t => t.price)), priceTiers };
    }
    // schema.org 单价（USD）
    if (schema?.offers?.price) {
      return { price: parseFloat(schema.offers.price), priceTiers: [] };
    }
    // DOM 降级
    const priceEl = document.querySelector('[class*="price-range"], [class*="price"] [class*="value"]');
    const text = priceEl?.innerText || '';
    const nums = [...text.matchAll(/([\\d,]+\\.?\\d*)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, ''))).filter(n => n > 0);
    return { price: nums.length > 0 ? Math.min(...nums) : 0, priceTiers: [] };
  }

  function _alibaba_getVariants(gd) {
    const variants = [];
    // detailData.globalData.product.sku.skuAttrs（已确认路径）
    const skuAttrs = gd?.product?.sku?.skuAttrs || [];
    for (const attr of skuAttrs) {
      const name = attr.name || attr.skuPropertyName;
      if (!name) continue;
      const options = (attr.values || []).map(v => ({
        value: v.name || String(v.id || ''),
        imageUrl: v.originImage || v.largeImage || undefined,
      })).filter(o => o.value);
      if (options.length > 0) variants.push({ name, options });
    }
    // DOM 降级
    if (variants.length === 0) {
      const groups = document.querySelectorAll('[class*="sku-attr-item"], [class*="attribute-item"]');
      for (const g of groups) {
        const label = g.querySelector('[class*="label"], [class*="name"]')?.textContent?.trim();
        if (!label) continue;
        const options = [...g.querySelectorAll('[class*="value"], [class*="option"]')]
          .map(el => ({ value: el.innerText?.trim().split('\\n')[0] || '', imageUrl: el.querySelector('img')?.src }))
          .filter(o => o.value);
        if (options.length > 0) variants.push({ name: label, options });
      }
    }
    return variants;
  }

  function _alibaba_getSpecifications(gd) {
    const specs = {};
    // 合并三个属性数组：基础属性 + 行业关键属性 + 其他属性
    const attrs = [
      ...(gd?.product?.productBasicProperties || []),
      ...(gd?.product?.productKeyIndustryProperties || []),
      ...(gd?.product?.productOtherProperties || []),
    ];
    for (const attr of attrs) {
      const key = attr.attrName || attr.name;
      const val = attr.attrValue || attr.value;
      if (key && val) specs[key] = Array.isArray(val) ? val.join(', ') : String(val);
    }
    if (Object.keys(specs).length === 0) {
      const rows = document.querySelectorAll('[class*="attribute"] tr, [class*="spec"] tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const key = cells[0].innerText?.trim();
          const val = cells[1].innerText?.trim();
          if (key && val) specs[key] = val;
        }
      }
    }
    return specs;
  }

  function _alibaba_getMainImages(schema, gd) {
    // schema.org image 数组（已确认可用）
    if (schema?.image?.length > 0) {
      return [].concat(schema.image).map(img => {
        const s = typeof img === 'string' ? img : (img.url || img.contentUrl || '');
        return s ? (s.startsWith('http') ? s.split('?')[0] : 'https:' + s.split('?')[0]) : '';
      }).filter(Boolean);
    }
    // detailData.globalData 降级
    const imgList = gd?.imagePathList || gd?.pdp?.imagePathList || [];
    if (imgList.length > 0) {
      return imgList.map(img => {
        const s = typeof img === 'string' ? img : (img.url || '');
        return s ? (s.startsWith('http') ? s.split('?')[0] : 'https:' + s.split('?')[0]) : '';
      }).filter(Boolean);
    }
    // DOM 降级
    const srcs = new Set();
    for (const sel of ['[class*="gallery"] img', '[class*="slider"] img', '[class*="main-image"] img']) {
      for (const img of document.querySelectorAll(sel)) {
        const src = (img.src || img.getAttribute('data-src') || '').split('?')[0];
        if (src && src.includes('alicdn.com')) srcs.add(src);
      }
    }
    return [...srcs];
  }

  // Alibaba 详情图：拦截 XHR 响应 + DOM 兜底
  let _alibabaDetailResolve;
  const _alibabaDetailPromise = new Promise(resolve => { _alibabaDetailResolve = resolve; });
  if (SITE === 'alibaba') {
    (function () {
      let resolved = false;
      function resolveOnce(imgs) {
        if (resolved) return;
        resolved = true;
        _alibabaDetailResolve([...new Set(imgs)]);
      }
      function extractImgs(html) {
        const pat = /(?:src|data-src)="(https?:[^"]+\\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi;
        return [...html.matchAll(pat)].map(m => m[1].split('?')[0])
          .filter(s => s.includes('alicdn.com') || s.includes('alibaba.com'));
      }
      // 拦截 XHR（alibaba 详情 HTML 通常通过 XHR 异步加载）
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__scraperUrl = String(url);
        return origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
          const url = this.__scraperUrl || '';
          const text = this.responseText || '';
          if (!resolved && text.length > 200 && text.includes('<img') &&
              (url.includes('detail') || url.includes('desc') || url.includes('template') || url.includes('offer'))) {
            const imgs = extractImgs(text);
            if (imgs.length > 0) resolveOnce(imgs);
          }
        });
        return origSend.apply(this, arguments);
      };
      // 8s 兜底：从页面 description 区域直接取图
      setTimeout(() => {
        const selectors = ['[class*="description"]', '[class*="product-detail"]',
          '[class*="detail-desc"]', '#product-description', '#description', '[class*="overview"]'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const imgs = [...el.querySelectorAll('img')]
            .map(img => (img.src || img.getAttribute('data-src') || '').split('?')[0])
            .filter(s => s && (s.includes('alicdn.com') || s.includes('alibaba.com')));
          if (imgs.length > 0) { resolveOnce(imgs); return; }
        }
        resolveOnce([]);
      }, 8000);
    })();
  } else {
    _alibabaDetailResolve([]);
  }

  // ─── 通用工具 ────────────────────────────────────────────────────────────────

  function getSkuImages(variants) {
    return variants.flatMap(v => v.options.map(o => o.imageUrl).filter(Boolean));
  }

  // ─── 采集主流程 ──────────────────────────────────────────────────────────────

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    setStatus('采集中...');

    try {
      let offerId, name, description, priceData, variants, specifications, mainImages, detailImages;

      if (SITE === 'alibaba') {
        offerId = _alibaba_getOfferId();
        if (!offerId) throw new Error('无法识别商品 ID，请检查页面 URL');
        setStatus('提取商品数据...');
        const schema = _alibaba_getSchemaData();
        const gd     = _alibaba_getGlobalData();
        name          = _alibaba_getName(schema, gd);
        description   = _alibaba_getDescription(schema, gd);
        priceData     = _alibaba_getPriceData(schema, gd);
        variants      = _alibaba_getVariants(gd);
        specifications = _alibaba_getSpecifications(gd);
        mainImages    = _alibaba_getMainImages(schema, gd);
        setStatus('提取详情图（最多等待 8 秒）...');
        detailImages  = await _alibabaDetailPromise;
      } else {
        offerId = _1688_getOfferId();
        if (!offerId) throw new Error('无法识别商品 ID，请检查页面 URL');
        setStatus('提取商品数据...');
        name          = _1688_getName();
        description   = _1688_getDescription();
        priceData     = _1688_getPriceData();
        variants      = _1688_getVariants();
        specifications = _1688_getSpecifications();
        mainImages    = _1688_getMainImages();
        setStatus('提取详情图...');
        detailImages  = await _1688_getDetailImages();
      }

      const skuImages = getSkuImages(variants);
      setStatus(\`上传中（\${mainImages.length} 主图 / \${detailImages.length} 详情图）...\`);

      const payload = {
        name, description,
        price: priceData.price, priceTiers: priceData.priceTiers,
        variants, specifications, mainImages, skuImages, detailImages,
        sourceUrl: location.href, offerId,
      };

      GM_xmlhttpRequest({
        method: 'POST',
        url: STORE_URL + '/api/admin/products/collect-from-browser',
        headers: {
          'Content-Type': 'application/json',
          'X-Scraper-Key': API_KEY,
        },
        data: JSON.stringify(payload),
        onload(res) {
          if (res.status === 200) {
            const result = JSON.parse(res.responseText);
            statusEl.innerHTML = \`✓ 采集成功！<a href="\${STORE_URL}/admin/products/\${result.productId}" target="_blank" style="color:#2563eb;text-decoration:underline">查看商品</a>\`;
            statusEl.className = 'ok';
          } else {
            const err = JSON.parse(res.responseText);
            setStatus('✗ ' + (err.error || '保存失败'), 'err');
          }
          btn.disabled = false;
        },
        onerror() {
          setStatus('✗ 网络错误，请检查店铺服务是否运行', 'err');
          btn.disabled = false;
        },
      });
    } catch (e) {
      setStatus('✗ ' + e.message, 'err');
      btn.disabled = false;
    }
  });
})();`
}

export function ScraperSettingsCard() {
  const [status, setStatus] = useState<ScraperStatus | null>(null)
  const [cookie, setCookie] = useState('')
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [cookieMsg, setCookieMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [scriptCopied, setScriptCopied] = useState(false)

  const fetchStatus = useCallback(async () => {
    const data = await fetch('/api/admin/settings/scraper').then(r => r.json()).catch(() => null)
    setStatus(data)
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  async function handleSaveCookie() {
    if (!cookie.trim()) return
    setSaving(true)
    setCookieMsg(null)
    try {
      const res = await fetch('/api/admin/settings/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie }),
      })
      if (res.ok) {
        setCookieMsg({ type: 'success', text: 'Cookie 已更新' })
        setCookie('')
        fetchStatus()
      } else {
        const d = await res.json()
        setCookieMsg({ type: 'error', text: d.error || '保存失败' })
      }
    } catch {
      setCookieMsg({ type: 'error', text: '网络错误' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerateKey() {
    if (!confirm('重新生成 API Key 后，旧的油猴脚本将失效，需要重新安装。确认继续？')) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/admin/settings/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate-api-key' }),
      })
      if (res.ok) fetchStatus()
    } finally {
      setRegenerating(false)
    }
  }

  function handleCopyScript() {
    if (!status?.apiKey) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const script = buildUserscript(status.apiKey, appUrl)
    navigator.clipboard.writeText(script).then(() => {
      setScriptCopied(true)
      setTimeout(() => setScriptCopied(false), 2000)
    })
  }

  const appUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : ''

  return (
    <div className="space-y-6">
      {/* Playwright 方案 Cookie */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Playwright 采集（Cookie 方式）</CardTitle>
          <CardDescription>服务端无头浏览器采集。Cookie 过期或被风控时会失败。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>当前状态</Label>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              {status === null ? (
                <span className="text-sm text-muted-foreground">加载中...</span>
              ) : status.hasCookie ? (
                <>
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600">已配置</Badge>
                  <span className="text-sm font-mono text-muted-foreground">{status.cookiePreview}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {status.cookieSource === 'database' ? '数据库' : '环境变量'}
                  </Badge>
                </>
              ) : (
                <>
                  <Badge variant="destructive">未配置</Badge>
                  <span className="text-sm text-muted-foreground">采集功能不可用</span>
                </>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cookie-input">更新 Cookie</Label>
            <Textarea
              id="cookie-input"
              placeholder="粘贴从浏览器复制的 1688 Cookie 字符串..."
              rows={3}
              className="font-mono text-xs"
              value={cookie}
              onChange={e => setCookie(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              浏览器登录 1688 → 开发者工具 → Network → 任意商品页请求 → 复制 Request Headers 中的 Cookie
            </p>
          </div>
          {cookieMsg && (
            <p className={`text-sm ${cookieMsg.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {cookieMsg.text}
            </p>
          )}
          <Button onClick={handleSaveCookie} disabled={saving || !cookie.trim()}>
            {saving ? '保存中...' : '保存 Cookie'}
          </Button>
        </CardContent>
      </Card>

      {/* 油猴插件方案 */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">油猴插件采集（推荐）</CardTitle>
          <CardDescription>
            在真实浏览器中采集，无 Cookie 失效问题，不会被风控。需安装 Tampermonkey 扩展。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 安装步骤 */}
          <div className="space-y-2">
            <Label>使用步骤</Label>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>安装浏览器扩展 <strong>Tampermonkey</strong>（Chrome / Edge）</li>
              <li>点击下方"复制脚本"按钮</li>
              <li>打开 Tampermonkey → 新建脚本 → 粘贴并保存</li>
              <li>浏览 <strong>1688</strong> 或 <strong>Alibaba.com</strong> 商品页，点击右下角"采集当前商品"即可</li>
            </ol>
          </div>

          <Separator />

          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
                {status?.apiKey ?? '加载中...'}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateKey}
                disabled={regenerating}
              >
                {regenerating ? '...' : '重新生成'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">此 Key 已内嵌在生成的脚本中，重新生成后旧脚本失效</p>
          </div>

          {/* 生成脚本 */}
          <div className="space-y-2">
            <Label>目标店铺地址</Label>
            <code className="block text-xs bg-muted px-3 py-2 rounded">{appUrl}</code>
            <p className="text-xs text-muted-foreground">
              如需修改，在 <code className="bg-muted px-1 rounded">.env</code> 中更新 NEXT_PUBLIC_APP_URL
            </p>
          </div>

          <Button onClick={handleCopyScript} disabled={!status?.apiKey}>
            {scriptCopied ? '已复制！' : '复制油猴脚本'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
