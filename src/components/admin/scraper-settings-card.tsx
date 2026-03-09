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
// @name         1688 商品采集到店铺
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 1688 商品页一键采集数据到店铺后台
// @author       store-admin
// @match        https://detail.1688.com/offer/*.html
// @match        https://detail.1688.com/offer/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      ${new URL(appUrl).hostname}
// ==/UserScript==

(function () {
  'use strict';

  const STORE_URL = '${appUrl}';
  const API_KEY = '${apiKey}';

  // ─── UI ─────────────────────────────────────────────────────────────────────
  GM_addStyle(\`
    #__scraper_panel__ {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,.15); padding: 16px; width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px; line-height: 1.5;
    }
    #__scraper_panel__ h4 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
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

  // ─── 数据提取 ────────────────────────────────────────────────────────────────

  function getOfferId() {
    const m = location.href.match(/\\/offer\\/(\\d+)/);
    return m ? m[1] : '';
  }

  function getName() {
    const el = document.querySelector('.module-od-title');
    if (el && el.textContent.trim()) return el.textContent.trim();
    const meta = document.querySelector('meta[property="og:title"]');
    return meta ? meta.getAttribute('content').trim() : '';
  }

  function getDescription() {
    const meta = document.querySelector('meta[name="description"]');
    return meta ? meta.getAttribute('content').trim() : '';
  }

  function getPriceData() {
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

  function getVariants() {
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

  function getSpecifications() {
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

  function getMainImages() {
    const srcs = [...document.querySelectorAll('img.od-gallery-img')]
      .map(img => img.src)
      .filter(src => src && src.includes('alicdn.com') && src.includes('cib.jpg'));
    // 去掉 _b.jpg 缩略图后缀，还原高清原图
    return [...new Set(srcs.map(src => src.replace(/_b\\.jpg$/, '')))];
  }

  function getSkuImages(variants) {
    return variants.flatMap(v => v.options.map(o => o.imageUrl).filter(Boolean));
  }

  // 从 performance 记录中找到 ICOSS 脚本 URL，获取详情图
  function getDetailImages() {
    return new Promise(resolve => {
      const resources = performance.getEntriesByType('resource');
      const icossEntry = resources.find(r =>
        (r.name.includes('itemcdn.tmall.com') || r.name.includes('itemcdn.tbcdn.cn')) &&
        r.name.includes('1688offer')
      );
      if (!icossEntry) { resolve([]); return; }
      fetch(icossEntry.name)
        .then(r => r.text())
        .then(text => {
          const match = text.match(/var\\s+offer_details\\s*=\\s*(\\{[\\s\\S]*\\})/);
          if (!match) { resolve([]); return; }
          try {
            const data = JSON.parse(match[1]);
            const content = data.content || '';
            const imgPattern = /src="(https?:\\/\\/[^"]+\\.(jpg|jpeg|png|webp|gif)[^"]*)"/gi;
            const imgs = [...content.matchAll(imgPattern)].map(m => m[1].split('?')[0]);
            resolve([...new Set(imgs)]);
          } catch { resolve([]); }
        })
        .catch(() => resolve([]));
    });
  }

  // ─── 采集主流程 ──────────────────────────────────────────────────────────────

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    setStatus('采集中...');

    try {
      const offerId = getOfferId();
      if (!offerId) throw new Error('无法识别商品 ID，请检查页面 URL');

      setStatus('提取商品数据...');
      const name = getName();
      const description = getDescription();
      const { price, priceTiers } = getPriceData();
      const variants = getVariants();
      const specifications = getSpecifications();
      const mainImages = getMainImages();
      const skuImages = getSkuImages(variants);

      setStatus('提取详情图...');
      const detailImages = await getDetailImages();

      setStatus(\`上传中（\${mainImages.length} 主图 / \${detailImages.length} 详情图）...\`);

      const payload = {
        name, description, price, priceTiers, variants,
        specifications, mainImages, skuImages, detailImages,
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
            setStatus('✓ 采集成功！点击查看商品', 'ok');
            // 在状态区加可点击链接
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
              <li>浏览 1688 商品页，点击右下角"采集当前商品"即可</li>
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
