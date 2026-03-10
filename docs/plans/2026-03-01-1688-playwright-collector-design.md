# 1688 商品采集（Playwright DOM 采集）设计文档

**日期:** 2026-03-01
**状态:** 已确认
**方案:** 仅浏览器采集（Playwright 全渲染 DOM 提取）

## 1. 背景与目标

在 admin 后台提供 1688 商品采集功能，用户输入 1688 商品页链接，通过 Playwright 浏览器自动化采集商品数据，预览确认后保存到数据库。

**约束：**
- 仅 Playwright 浏览器采集，不使用 HTTP 接口
- 部署在 VPS，headless 模式运行
- 管理后台手动触发，先预览再确认保存
- 不做验证码绕过、不做并发采集、不做自动重登录

## 2. 整体架构

```
用户在 Admin 后台输入 1688 链接
        ↓
POST /api/admin/products/scrape-1688
        ↓
Playwright 启动 → 注入 Cookie → 加载页面
        ↓
DOM 字段提取器（标题/价格/SKU/规格/图片/详情）
        ↓
结构化数据返回前端
        ↓
用户在预览页面查看/编辑采集结果
        ↓
确认后 → 下载图片到 R2 → 创建/更新 Product
```

### 2.1 关键组件

1. **API 路由** — `POST /api/admin/products/scrape-1688`，Admin 权限校验
2. **采集引擎** — `src/lib/scraper/1688-collector.ts`，Playwright 页面加载 + DOM 提取
3. **字段提取器** — `src/lib/scraper/extractors/`，每个字段独立提取函数
4. **前端页面** — `/admin/products/collect`，输入链接 → 预览 → 确认保存
5. **图片处理** — 确认保存时下载 1688 图片并上传 R2

## 3. 采集字段映射

| 1688 页面字段 | 提取方式 | 映射到 Product 模型 |
|---|---|---|
| 商品标题 | `h1` / title 区域 | `name` |
| 商品价格（区间/阶梯价） | 价格区域 DOM | `price` + `PriceTier[]` |
| SKU（颜色/尺寸等变体） | SKU 选择区域 | `ProductVariant[]` |
| 规格参数（材质/认证等） | 商品参数表格 | `specifications` (JSON) |
| 主图（轮播图） | 主图列表 | `ProductImage[]` (sortOrder) |
| SKU 图 | SKU 关联图片 | `ProductImage[]` |
| 详情图 | 详情区域图片列表 | `content` (EditorJS 格式) |
| 商品描述/卖点 | 页面描述文字 | `description` |
| 最小起订量 | MOQ 区域 | 存入 `specifications` |
| 发货地 | 物流区域 | 存入 `specifications` |

**图片处理流程：**
- 采集阶段：返回 1688 CDN 原始 URL 用于前端预览
- 保存阶段：下载图片 → 上传 R2 → 替换为本站 URL

**不采集的字段：** 店铺信息、评价、销量、物流费用

## 4. 前端交互流程

**页面路径：** `/admin/products/collect`

1. **输入阶段** — 输入框 + "采集"按钮，粘贴 1688 链接
2. **采集中** — Loading 状态，显示进度信息
3. **预览阶段** — 展示采集结果：
   - 商品标题（可编辑）
   - 价格/阶梯价表格
   - 主图预览（1688 CDN）
   - SKU 变体列表
   - 规格参数表格
   - 详情图预览
4. **确认保存** — 点击"保存商品"：
   - 下载图片到 R2
   - 创建 Product 及关联数据
   - 跳转到商品编辑页面
5. **已有商品** — 通过 1688 链接匹配，提示"该商品已采集"，提供"更新"选项

## 5. 反爬应对

- **Cookie 注入：** 通过 `SCRAPER_1688_COOKIE` 环境变量模拟登录态
- **User-Agent：** 使用真实浏览器 UA
- **随机延迟：** 页面加载后等待 1-3s 再操作
- **登录检测：** 跳转到登录页时返回 `ACCESS_BLOCKED`，提示更新 Cookie

## 6. 超时与错误处理

### 6.1 超时控制
- 页面加载超时：15s
- 总操作超时：30s

### 6.2 错误码
- `INVALID_URL` — URL 格式不对或非 1688 链接
- `ACCESS_BLOCKED` — 需要登录/验证码/被风控
- `PAGE_TIMEOUT` — 页面加载超时
- `PARSE_ERROR` — 页面结构无法解析
- `INCOMPLETE_DATA` — 数据不完整（带 warning 返回已有数据）

## 7. 非目标

- 不绕验证码
- 不做自动重登录
- 不做并发采集
- 不做全站爬虫
- 不做复杂反爬绕过
