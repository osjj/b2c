# 003 — 收紧常用反馈的动画属性

- **Status**: TODO
- **Commit**: 3a2a939
- **Severity**: HIGH
- **Category**: Performance / Cohesion & tokens
- **Estimated scope**: 1 CSS file

## Problem

`D:/project/b2c-store/src/modules/home-new/components/home-new.module.css` 当前片段：

```css
/* :71 / :353 */
transition: all 0.22s ease;
/* :1916 categoryCard/productCard */
transition: all 0.25s ease;
/* :2286 productBody a/b, productAsk */
transition: all 0.2s ease;
/* :3968 industryAction */
transition: gap 0.2s ease;
/* :2571 factoryTourDots button::before */
transition: background 0.2s ease, width 0.2s ease;
```

hub gap9→13px、featured10→14px、regular6→14px；图库bar22→34px。不是已测掉帧结论，而是明确可缩小的布局/绘制范围。

## Target

有限属性列表；间距和bar布局尺寸固定，用transform代替运动。首页参数与Portal fallback：

```css
/* .page局部参数，不动全站:root */
--home-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--home-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--home-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--home-duration-press: 160ms;
--home-duration-feedback: 150ms;
--home-duration-hover: 200ms;
```

纯颜色hover用150ms ease；箭头transform200ms ease；图库bar缩放150ms `cubic-bezier(0.23, 1, 0.32, 1)`。

## Repo conventions to follow

CSS Modules `.page` 已定义 `--home-*`；:318导航underline已显式只transition opacity/transform，跟随这种列举方式。Portal不能继承page变量，写完整fallback：`var(--home-ease-out, cubic-bezier(0.23, 1, 0.32, 1))`、`var(--home-duration-feedback, 150ms)`。

## Steps

1. 在 `.page` 参数区域添加上述tokens，已有颜色/字体不改。
2. `.btn` / `.navBtn`替换all为 `background-color 150ms ease, color 150ms ease, border-color 150ms ease, transform 160ms var(--home-ease-out, cubic-bezier(0.23, 1, 0.32, 1))`（时长可引用完整fallback token）。卡片容器仅 `background-color 150ms ease`；Ask Price组仅 `background-color 150ms ease, color 150ms ease, border-color 150ms ease`。
3. hub/action/regular strong取消gap transition及所有hover gap改动，保持基础9/10/6px。分别对其直属 `svg` 设置 `transition: transform 200ms ease`，对应可交互卡hover时箭头 `translateX(4px)`；移动hover只放在 `(hover: hover) and (pointer: fine)`。reduce transform none。文字、卡片尺寸不动。
4. 图库bar固定宽34px，基础 `transform: translate(-50%, -50%) scaleX(0.6470588235)`（22/34），active为 `translate(-50%, -50%) scaleX(1)`；保留8px高度和中心origin。transition仅background-color150ms ease、transform150ms完整ease-out fallback；reduce下scale即时变，保留颜色反馈。44px点击区域、aria-current不改。
5. submit和行业卡hover的box-shadow不再transition，保持静态基底shadow，删掉hover改变shadow的声明。行业图片保持基础filter，不做hover filter渐变。保留hover边框/颜色反馈，不把所有颜色变化禁掉。
6. 复核后面的override是否重新加回上述all/gap/width/filter过渡，只处理这几个可达选择器；不要清理全文件旧样式。

## Boundaries

只改本CSS。不得改DOM、价格、链接、API、图库键盘行为、地图/Hero调度或共享button/sheet。新curve来自技能目录，不能自行近似。不加will-change到所有卡片，不新增依赖。漂移先报告。

## Verification

- **Mechanical**：`git diff --check`；检索并确认目标可达选择器不再all、gap、width、box-shadow、filter过渡。因为只是CSS，不以全局typecheck冒充动画验证。
- **Feel check**：桌面反复hover按钮、产品、hub和solution，DevTools10%播放；文字/CTA宽度不变，仅箭头移动4px。图库点击与方向键反复切换，bar中心固定、点击目标不缩小；reduce无箭头位移，active颜色仍区分。
- Performance面板比较相同hover流程，CTA没有gap导致的Layout；记录实际结果，不承诺没有任何Paint。Portal computed style正确使用fallback。
- **Done when**：四组all删除，三类gap和图库width运动消除；控件功能/颜色/布局保持。
