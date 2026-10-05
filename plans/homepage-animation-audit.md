# LAIFAPPE 首页动画审查

日期：2026-10-05。基线：`3a2a939`。范围：`D:/project/b2c-store/src/app/page.tsx` 对应首页，以及它实际调用的导航、Hero、询价抽屉、工厂图库和地图资源。

## 结论与证据边界

优先修复减少动态效果覆盖、询价抽屉中断跳变和布局属性动画，然后缩短常用悬停反馈。首页已有有效的 Hero 暂停和图片准备机制，无需改写轮播调度。

使用 improve-animations 的八类标准，并对可达代码做复核。技术栈是 Next.js 16.1.1、React 19.2.3、Radix Dialog、CSS Modules、Tailwind 4 / tw-animate-css；本首页没有使用 Motion、GSAP 或 spring 库。`.page` 只有颜色和字体变量，没有动作参数。B2B 采购首页适合明确、轻微的反馈；导航、按钮、卡片每次访问会反复触发，询价和图库弹窗属于偶发交互，Hero/地图属于背景展示。

本地 `http://localhost:3100/` 浏览器核查使用已安装的 Chrome 和 Playwright：1440px 桌面，1024px 和 390px 菜单，reduce 模式，抽屉开关、Escape、悬停、图库。检查页内运行错误为 0；390px 检查没有水平溢出。这不是性能基准测试，没有测得掉帧或真实设备触屏表现。

读取了 [线上首页](https://www.laifappe.com/) 的页面内容；线上交互复核未取得 dialog，等待超时。因此下面的动画复现证据来自本地当前代码，不能据此声明线上修复、线上手感或部署一致性。

## 已确认发现（按影响与实施成本排序）

以下 CSS 路径均为 `D:/project/b2c-store/src/modules/home-new/components/home-new.module.css`；其他路径另行列出。

| # | 严重程度 | 分类 | 位置 | 发现 | 计划 |
| --- | --- | --- | --- | --- | --- |
| 1 | MEDIUM | Accessibility | CSS:521、1178、3326、189；`public/newpage/xuanchuan/order-world-map.svg`:7–16、49、57 | reduce 仅保护 Hero。浏览器确认抽屉仍有 320ms 位移，菜单仍有 max-height/translate，圆点仍以 2s 无限脉冲。嵌入的地图 SVG 自身还有 CSS/SMIL 无限动画，页面 CSS 无法穿透 img 停止它。 | 001 |
| 2 | HIGH | Interruptibility | CSS:1177–1182、1239–1253；`QuoteRequestForm.tsx`:248–268 | 开关关键帧固定从两个端点起步。浏览器两帧后关闭：X 从约 720px 跳到约 136px，再向右退出，复现入口未结束时的反向跳变。320ms 本身在抽屉合理预算内，不作为超时问题。 | 002 |
| 3 | HIGH | Performance | CSS:71、353、1916、2286、3792、3968、4077、2571 | 常用控件 `transition: all`；行业 CTA 改 gap，图库指示条改 width。会扩大动画范围或触发布局/绘制；未以此推断已掉帧。 | 003 |
| 4 | MEDIUM | Performance / Easing | CSS:510、512、3326–3335 | 菜单展开用 0→420/360px 的 max-height；1024px/390px 的 computed style 已确认。固定上限让视觉速度取决于实际内容高度，还推动下方布局。 | 004 |
| 5 | MEDIUM | Accessibility / Purpose & frequency | CSS:1938、2206、3820、3853、4331、5035；`NewHomePage.tsx`:804–810、960–971 | hover 位移没有 hover/pointer 条件；静态 OEM article、工厂 figure、WhyUs/询价配图也响应悬停。触屏表现需实机验收，不能把模拟检查当成实机证据。 | 005 |
| 6 | MEDIUM | Easing & duration | CSS:1935、2203、3713、3850、4328、4518 | 类目450ms、产品400ms、行业600ms、设施500ms、询价配图800ms。频繁浏览反馈偏慢；产品最终生效缩放是1.08，设施是1.06，不能只看前面的共享规则。 | 005 |
| 7 | LOW | Cohesion & tokens | CSS:1–18、71、353、1178、1935 | 动作时长和曲线散落；在首页模块建立少量共享参数，并显式给 Portal fallback。 | 003，并由002/004使用 |

## 保留与排除

- `HeroBackground.tsx:49–112` 已暂停后台/离屏/reduce 调度、等待 decode、跳过失败图片、分阶段挂载。保留 5200ms 切换间隔、3200ms 准备延迟和 1.3s 交叉淡入淡出；营销图允许比普通控件慢。
- OEM 四分图 `oemMedia` 为 3:2，当前没有缩放。保留它，不重新加回 hover zoom。
- 居中图库的 `translate(-50%, -50%)` 是定位，正确；没有发现 `scale(0)` 或裸 `ease-in`，不凑这类问题。
- CSS:2666–2907 的地图规则未作用于实际首页 DOM，不列为可达动画。但实际 JSX 在 `NewHomePage.tsx:535–539` 引用 `/newpage/xuanchuan/order-world-map.svg`；该资源位于本仓库 `public/`，读取后确认它自身含动画。因此001覆盖实际资源，而不是改无效的旧 CSS。
- MiniQuote 仅 B2B 且报价列表非空时出现。共享 Sheet 与首页 QuoteDrawer 时长不同，记录为后续一致性检查；本次未验证非空列表，不计划改全站 `ui/sheet.tsx`。
- 图库方向键应即时换图。保留即时响应，不加顺序队列或每次按键动画。国家代码 combobox 也无需添加入场动画。

## 可选机会（尚未实施）

1. 工厂图库弹窗：`FactoryTourDialog.tsx:23–35` 和 CSS:2435–2458 当前直接挂载。可在偶发开关时增加 overlay 150ms 透明度、content 200ms `cubic-bezier(0.23, 1, 0.32, 1)` 的 opacity + scale(0.97→1)，定位 translate 必须保留；reduce 只淡入。图片方向键仍即时。这是可选提案，尚未有连续中断/退出生命周期计划。
2. 询价成功消息：`QuoteRequestForm.tsx:369–377、500`。可对成功信息用150ms透明度反馈，成功文字使用礼貌 live region；先模拟接口成功，确认是否存在视觉突变。审查没有发送任何报价或调用邮件接口，也没有声称已观察到成功布局跳动。

## 验收策略

先完成001/002，再003/004/005。实施者按单份计划的 lint、浏览器 computed style、慢速播放与焦点验收执行；本次审查未跑 build 或 typecheck。共享导航及询价组件还需抽查 `/products`、`/about`、`/cases`、`/tools`，避免模块级样式影响其他页面。没有部署授权或发布步骤。
