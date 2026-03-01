# 1688 混合采集（接口优先 + 浏览器兜底）设计文档

**日期:** 2026-03-01  
**状态:** 已评审确认  
**作者:** Codex

## 1. 背景与目标

当前 1688 采集在部分链接上会退化为 fallback（markdown），导致以下字段不完整：
- 规格参数（材质、认证、属性项）
- SKU/阶梯价（型号-价格-库存映射）
- 详情内容（详情图、长描述、卖点）
- 图片（主图、SKU图、详情图）

目标是在不牺牲稳定性的前提下，把完整度提升到可运营水平，并满足以下约束：
- 方案：接口优先 + 浏览器兜底（混合方案）
- 兜底策略：平衡阈值触发
- 单条总耗时：8-20s
- 最终可用完整数据成功率：>=95%

## 2. 总体架构

### 2.1 分层结构
1. 入口层（`/api/admin/products/scrape-1688`）
2. 接口采集层（Primary）
3. 质量评估层（Scoring Gate）
4. 浏览器补齐层（Secondary / Playwright）
5. 合并与仲裁层（Merge）
6. 可观测层（Metrics & Debug）

### 2.2 核心流程
1. 标准化 URL，提取 `offerId`
2. 执行接口采集，生成 `CollectedProductV2`
3. 执行完整度评分与阈值判断
4. 不达标时触发 Playwright 定向补字段
5. 合并结果并输出最终 `AIGeneratedProduct`
6. 返回 `source/parseMode/debug/quality` 便于前端展示与排障

## 3. 字段采集策略

### 3.1 规格参数
接口优先来源：
- `featureAttributes`
- `props`
- `offerSystemAttributes`

浏览器补齐来源：
- 商品参数区 DOM
- 详情文案中材质/认证模式匹配

合并规则：
- 同名键去重，接口值优先
- 同名不同值保留多值（`A / B`）
- 输出下限：>=6 条，否则标记 `spec_incomplete`

### 3.2 SKU / 阶梯价
接口优先来源：
- `tradeModel.skuMap`
- `tradeModel.offerPriceModel.currentPrices`
- `skuProps`

浏览器补齐来源：
- SKU 面板（可选项、展示价、库存）

合并规则：
- 主键：`skuId/specId/specAttrs`
- 价格：`discountPrice ?? price`
- 库存：`canBookCount` 优先
- 阶梯价按起订量排序；单档时生成默认 4 档

### 3.3 详情内容
接口优先来源：
- `description.detailUrl`
- 页面 JSON 中详情片段

浏览器补齐来源：
- 详情容器懒加载图片
- 卖点段落抽取

合并规则：
- 详情图 URL 规范化并去重
- 过滤平台声明/页脚噪音
- 输出下限：详情图 >=5 张

### 3.4 图片
接口优先来源：
- `offerImgList/imageList/images`
- `skuProps.value[].imageUrl`

浏览器补齐来源：
- 主图轮播高分图
- SKU 切换关联图
- 详情图

合并规则：
- 分类保存：`mainImages/skuImages/detailImages`
- 输出 `images = main + sku + detail`（去重后限长）
- 优先级：主图 > SKU 图 > 详情图

## 4. 触发阈值（平衡模式）

满足任一条件触发浏览器兜底：
- `specCount < 6`
- `skuMapCount == 0` 或 `priceTierCount == 0`
- `detailImageCount < 5`
- `mainOrSkuImageCount < 4`

## 5. 超时、重试与降级

### 5.1 超时预算
- 接口采集：4s
- 评分+合并：<1s
- 浏览器补齐：12s
- 总超时：20s

### 5.2 重试策略
- 接口层：`timeout/429/5xx` 重试 1 次（指数退避）
- 浏览器层：`launch/nav timeout` 重试 1 次
- `captcha/强风控` 不重试

### 5.3 降级策略
- 接口结果达到最低可用阈值：返回成功 + warning
- 接口不足且浏览器失败：返回失败 + 错误码 + debug

## 6. 错误码

建议统一错误码：
- `INVALID_URL`
- `ACCESS_BLOCKED`
- `INTERFACE_PARTIAL`
- `BROWSER_TIMEOUT`
- `BROWSER_BLOCKED`
- `PARSE_INCOMPLETE`
- `COLLECT_FAILED`

## 7. 监控指标

- 接口成功率
- 浏览器兜底触发率
- 最终成功率（目标 >=95%）
- P50/P95 总耗时（目标 8-20s）
- 字段完整率（spec/SKU/detail/image）
- 错误码分布

## 8. 测试与发布

### 8.1 测试
- 单元测试：提取器、评分器、合并器
- 契约测试：固定样本页输出结构
- E2E：接口成功、接口部分失败触发兜底、兜底失败降级

### 8.2 灰度
- 10% -> 50% -> 100% 分阶段放量
- 保留仅接口开关，支持快速回滚

## 9. 非目标

- 不做通用全站爬虫
- 不做无限并发扩展
- 不做复杂反爬绕过平台策略

## 10. 结论

采用“接口优先 + 浏览器定向兜底 + 字段级合并”的混合方案，可在可维护成本下显著提升采集完整度，并满足当前业务目标（成功率 >=95%、耗时 8-20s）。
