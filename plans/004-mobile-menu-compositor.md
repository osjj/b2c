# 004 — 移动导航使用浮层过渡

- **Status**: TODO
- **Commit**: 3a2a939
- **Severity**: MEDIUM
- **Category**: Performance / Interruptibility / Physicality
- **Estimated scope**: 2 files；导航结构不改，浮层定位与关闭可交互性

## Problem

`D:/project/b2c-store/src/modules/home-new/components/home-new.module.css:508–512`：

```css
.nav .mobileMenu {
  display: block; background: #0b1929; max-height: 0; opacity: 0; overflow: hidden;
  transition: max-height 0.28s ease, opacity 0.22s ease;
}
.nav .mobileMenuOpen { max-height: 420px; opacity: 1; }
```

mobile版本:3325–3335另加translateY(-6px)，max-height为360px。`D:/project/b2c-store/src/modules/home-new/components/NewHomeNav.tsx:116–137` 是实际菜单。浏览器两断点确认动画布局属性。

## Target

≤1250px：菜单在header下方覆盖页面，不再推开首页内容。关闭opacity0、translateY(-6px)，展开opacity1、translateY(0)；200ms `cubic-bezier(0.23, 1, 0.32, 1)`；transition可反向连续。reduce仅opacity150ms ease。

这包含一个明确行为调整：从推开正文改为浮层。保留七个导航项、44px行高和ARIA，不引入高度spring或新依赖。

## Repo conventions to follow

保留 `.navSticky { position: sticky; top:0; z-index:100 }`、header背景与现有按钮。`.nav` 增 `position: relative` 为浮层锚点；延续CSS Modules `mobileMenuOpen`、现有boolean menuOpen。可使用003的token，但所有var给200ms/完整curve fallback。

## Steps

1. 在两个原有断点移除max-height开关/过渡和`.nav .mobileMenu:not(.mobileMenuOpen)`即时visibility规则；桌面>1250px保留display none。
2. ≤1250px浮层规则：position absolute，left/right0、top100%，height auto，max-height `calc(100dvh - 100px)`（用于静态滚动约束，不动画），overflow-y auto。保留原各断点背景、链接padding；菜单加 `overscroll-behavior: contain`。
3. 基础closed `opacity:0; transform:translateY(-6px); visibility:hidden; pointer-events:none; transition: opacity 200ms var(--home-ease-out, cubic-bezier(0.23,1,0.32,1)), transform 200ms var(--home-ease-out, cubic-bezier(0.23,1,0.32,1)), visibility 0s linear 200ms;`；open改opacity1/transform0/visibility visible/pointer-events auto，visibility delay0。不得用keyframes重启。
4. NewHomeNav菜单容器在关闭时加 `inert={!menuOpen}`，`aria-hidden={!menuOpen}`，立即阻止Tab进入退出中的链接。只针对≤1250px的菜单；desktop一直不可见。保留触发器aria-expanded/controls。
5. Escape关闭并focus回移动菜单按钮（加button ref）；选择链接仍关闭。点击header/menu外关闭并仅在焦点原本位于菜单内时恢复按钮焦点，避免夺走新点击目标。窗口变为desktop时关闭残留menuOpen。
6. CSS末尾reduce将transform none、opacity150ms ease、visibility延迟150ms，open delay0；取消001留下的max-height终值覆盖。不得把nav的背景动画和菜单状态混淆。

## Boundaries

只改NewHomeNav.tsx和home-new.module.css。不改导航链接、品牌、CTA顺序或页面数据。共享导航会影响其他使用它的路由，必须交叉验收。不动画clip-path/height/max-height。若当前设计已有明确推开正文的决策记录则报告该冲突，不自行覆盖。

## Verification

- **Mechanical**：`npx eslint src/modules/home-new/components/NewHomeNav.tsx`；`git diff --check`。
- **Feel check**：390/768/1024/1250/1251px，开关三次并途中反向；DevTools10%播放确认不跳起点，Hero边界不移动，菜单从header下方出现，z-index正确。短屏滚动能到所有链接且无水平溢出。
- 鼠标、Tab、Enter、Escape、外点、链接跳转；closed/closing菜单不可Tab，焦点恢复规则正确。reduce无translate；按钮/颜色反馈仍在。
- `/products`、`/cases`、`/about`、`/tools`抽查相同断点；真实手机检查触屏/滚动，模拟视口不能替代该项。
- **Done when**：展开不触发布局高度动画，所有链接可操作、关闭焦点安全、共享页面无覆盖错误。
