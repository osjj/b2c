# 001 — 补齐首页减少动态效果

- **Status**: IMPLEMENTED
- **Commit**: 3a2a939
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 3 files：现有CSS、首页地图 JSX、新静态SVG；不改轮播调度

## Problem

`D:/project/b2c-store/src/modules/home-new/components/home-new.module.css:521–529` 当前只保护Hero：

```css
@media (prefers-reduced-motion: reduce) {
  .heroSlide { transition: none; }
  .hero:hover .heroSlide { transform: none; }
}
```

同文件:1178 `animation: quoteDrawerSlideIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards;`，:189 `animation: pulse 2s infinite;`，:3327 `max-height 0.28s ease,` 不受保护。浏览器 reduce 下确认都仍执行。

`D:/project/b2c-store/src/modules/home-new/components/NewHomePage.tsx:538`：

```tsx
<Image src={`${ASSET_BASE}/order-world-map.svg`} alt="" fill sizes="100vw" unoptimized />
```

`ASSET_BASE` 是 `/newpage/xuanchuan`。实际 `D:/project/b2c-store/public/newpage/xuanchuan/order-world-map.svg:7、10、11、49、57` 有CSS动画及gradient的SMIL无限动画，外层样式无法覆盖其内部。

## Target

reduce：移除位移、缩放、无限脉冲；保留颜色反馈，抽屉使用200ms opacity淡入/淡出，菜单高度即时到终态、opacity150ms。地图选用完全静态、外观对应默认帧的SVG。普通模式保留既有地图和Hero。

## Repo conventions to follow

仍使用 `home-new.module.css` 的局部类名和现有 Radix data-state；HeroBackground.tsx:57 的 `canPlay()` 不动。Radix Portal 挂在 body，不能依赖 `.page` 后代选择器或只在 `.page` 定义的变量。

## Steps

1. 在CSS文件末尾添加reduce override，覆盖 `.liveDot` 的 `animation: none`；保留当前静态背景/光晕。
2. 给两个 quoteDrawerPanel data-state 分别改为 `quoteOverlayFadeIn 200ms cubic-bezier(0.23, 1, 0.32, 1) forwards` / `quoteOverlayFadeOut 200ms cubic-bezier(0.23, 1, 0.32, 1) forwards`，并设置 `transform: none`。Overlay沿用同样200ms opacity关键帧，不能禁用关闭动画后留下悬挂节点。002实施时替换这一生命周期，但保留同等reduce结果。
3. 以更高或相同specificity覆盖 `.nav .mobileMenu` / `.mobileMenuOpen`：`transform: none; transition: opacity 150ms ease;`，保留各断点原有关闭/打开max-height终值，取消max-height过渡。closed原有visibility保护保留。
4. 在reduce块逐项覆盖移动元素的实际hover规则：`.logo:hover .logoIcon`；`.btn:hover .arr`；`.navBtn:hover .arr`；`.quoteSubmit:hover:not(:disabled)`；`.categoryCard:hover .categoryImage img`；`.productCard:hover .productImage img`；`.facilityImage:hover img`；`.whySection:hover .whyImage img`；`.quoteImage:hover img`；`.constructionHubSpotlight:hover`；`.constructionHubSpotlight:hover .constructionHubMedia img`；`.industryFeaturedCard:hover`；`.industrySolutionCard:hover`；两种行业卡hover img；`.oemCapabilityList article:hover`。目标 `transform: none`，这些transform transition项取消，颜色/边框150ms ease保留。不能用全站 `* { animation: none }`。
5. 固定行业CTA间距，不再在reduce切换gap：hub为9px，featured为10px，regular strong为6px。此项003会在所有模式去掉gap运动。
6. 从 `order-world-map.svg` 复制 `order-world-map-static.svg`。保持viewBox、地形、路线、文字、颜色、滤镜和标识；删除所有 `animateTransform` / `animateMotion` 元素以及对应只用于动画的mpath，删除所有CSS animation声明、delay/duration、keyframes。不要依靠 `display:none` 隐藏SMIL来宣称它停止。动态原资源不改。静态 `.map-route` 为原默认dash-offset，`.china-ring/.china-burst/.dest-dot` 用原未动画的scale=1与原opacity，保留当前隐藏的 `.route-pulses`。
7. `OrderWorldMap` 的现有Image外包 `<picture>`；增加 `<source media="(prefers-reduced-motion: reduce)" srcSet={`${ASSET_BASE}/order-world-map-static.svg`} />`，fallback使用原有unoptimized Image；保留父span定位、尺寸和aria-hidden。

## Boundaries

仅以上3文件。禁止改HeroBackground定时器、商业文案、图片构图、表单API、全局UI组件或采购案例未提交改动。无新依赖。片段漂移先复核/报告。

## Verification

- **Mechanical**：`npx eslint src/modules/home-new/components/NewHomePage.tsx`；`git diff --check`。新SVG检查没有任何animation/keyframes/SMIL元素。
- **Feel check**：本地1440/1024/390px，在打开抽屉前和打开途中切换reduce；抽屉只有200ms透明度，没有水平位移；Escape关闭并恢复焦点；菜单无位移/高度过程，静态圆点不脉冲；所有卡片hover不缩放/上移，按钮颜色反馈仍在。
- 在DevTools Animations设10%回放，确认reduce不残留位移动画；检查地图img.currentSrc确实是static.svg。关闭reduce后恢复动态地图和Hero暂停/恢复行为。
- 抽查 `/products`、`/about` 的共享导航/抽屉。无需提交询价。
- **Done when**：reduce模式无上述位移/无限动画；普通模式功能和图像完整；Portal动画正常结束并卸载。

## 实施记录（2026-10-05）

最终实现：减少运动的抽屉由共享 useAnimatedDialog.ts 使用WAAPI淡入/淡出，替代原计划CSS关键帧；其余偏好覆盖和静态地图按计划实施。

本地开发/生产预览回归、定向lint、首页数据测试和production build已核查；详细证据见 [实施验收](./homepage-motion-implementation.md)。真实手机手感未做实机验收，触屏验证使用浏览器模拟。未部署。
