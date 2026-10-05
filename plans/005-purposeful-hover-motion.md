# 005 — 精简装饰运动，缩短常用悬停

- **Status**: IMPLEMENTED
- **Commit**: 3a2a939
- **Severity**: MEDIUM
- **Category**: Purpose & frequency / Accessibility / Easing & duration
- **Estimated scope**: 1 CSS file；保留内容与布局

## Problem

`D:/project/b2c-store/src/modules/home-new/components/home-new.module.css` 当前实际生效代码：

```css
/* :189 */ animation: pulse 2s infinite;
/* :1935 */ transition: transform 0.45s ease;
/* :2203 */ transition: transform 0.4s ease;
/* :2206–2207 */ .productCard:hover .productImage img { transform: scale(1.08); }
/* :4328 */ transition: transform 0.5s ease;
/* :5035–5037 */ .oemCapabilityList article:hover {
  background: rgba(255, 250, 242, 0.94);
  transform: translateY(-2px);
}
```

静态OEM article和facility figure在NewHomePage.tsx:960–971、804–810实际挂载，不能点击却悬停移动。WhyUs/询价大图也分别8s/800ms缩放。没有hover/pointer media gate。

## Target

静态展示不响应鼠标运动；常用可点击类目/产品/行业图片均200ms ease、scale1.03，行业可点击卡上移2px、200ms ease。所有hover位移在 `(hover: hover) and (pointer: fine)` 下；reduce无位移。绿色点保留静态，不以无限脉冲暗示实时状态。Hero保留交叉淡入淡出和调度，取消跟随鼠标放大。

## Repo conventions to follow

跟随home-new.module.css局部选择器和明确属性列表。引用003的duration-hover时提供200ms fallback。`:hover`颜色和`:focus-visible`仍在各输入方式可用；001的reduce规则必须放在最终级联后生效。OEM媒体:4951/4968当前3:2、不缩放，是应保留的范例。

## Steps

1. `.liveDot`删除animation，删除专属pulse keyframes（:198–207）且只在无其他引用时删除。保留颜色和静态box-shadow。没有实时数据绑定，不新增online文案。
2. 删除 `.hero:hover .heroSlide` 的scale以及heroSlide transform8s transition项；保留opacity1.3s ease与active opacity0.86。不改HeroBackground.tsx任何调度。
3. 删除WhyUs图片8s transform transition及其hover scale、facility img hover scale/transition、quoteImage img hover scale/transition、OEM article hover translate和transform transition。保留静态配图、caption、背景/边框hover颜色；facility的cursor pointer改为auto，因为figure无操作。
4. 统一 `.categoryImage img`、`.productImage img`、`.constructionHubMedia img`、`.industryFeaturedImage img`、`.industryCardImage img` 的transform为200ms ease。删掉后置400/450/600ms override。行业图片filter始终保持原基础 `saturate(0.94) contrast(1.02)`，不渐变filter。
5. 搬移而不是复制以下hover运动进 `(hover: hover) and (pointer: fine)`：logo scale1.04，btn/navBtn arrow translateX4px，submit translateY(-1px)，类目/产品/行业image scale1.03，hub/行业卡translateY(-2px)。card位移transition200ms ease。颜色变化留在原hover；保证旧无条件transform声明不存在。003新加的行业箭头gate保留。
6. 降低到200ms不是要求所有营销动画都短于300ms；不新增滚动入场、数字滚动或逐字动画。reduce最终覆盖上述运动，保留150ms颜色反馈。

## Boundaries

仅home-new.module.css，不改JSX、图片src、3:2构图、报价、商业事实、Hero loading或共享UI。不改地图动效（001的静态偏好方案负责它）。不用全局hover覆盖和全局animation:none。漂移先报告。

## Verification

- **Mechanical**：`git diff --check`；确认目标hover transform全在fine-pointer gate；没有产品scale1.08和设施scale1.06后置override。
- **Feel check**：桌面快速扫过8张类目和产品卡；DevTools10%播放确认200ms、scale1.03，进出途中连续反向，文字不动。静态图/OEM article不跟鼠标位移，Hero不在hover时放大。
- 390px touch模拟与真实手机点击链接：无残留hover缩放；Tab focus仍清楚；reduce不放大。静态绿色点、OEM原图、图片object-fit与所有链接保持正确。
- **Done when**：常用卡反馈轻微且快速；非交互内容没有装饰位移；真实设备和reduce验收完成。

## 实施记录（2026-10-05）

最终实现：静态内容zoom/pulse移除、fine-pointer gate和200ms轻微hover均已落地；OEM3:2原构图和Hero调度保留。

本地开发/生产预览回归、定向lint、首页数据测试和production build已核查；详细证据见 [实施验收](./homepage-motion-implementation.md)。真实手机手感未做实机验收，触屏验证使用浏览器模拟。未部署。
