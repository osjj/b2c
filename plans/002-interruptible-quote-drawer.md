# 002 — 让询价抽屉从当前画面连续反转

- **Status**: IMPLEMENTED
- **Commit**: 3a2a939
- **Severity**: HIGH
- **Category**: Interruptibility / Easing & duration
- **Estimated scope**: 2 files；受控Radix生命周期和局部CSS

## Problem

`D:/project/b2c-store/src/modules/home-new/components/home-new.module.css:1177–1182`：

```css
.quoteDrawerPanel[data-state="open"] {
  animation: quoteDrawerSlideIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.quoteDrawerPanel[data-state="closed"] {
  animation: quoteDrawerSlideOut 0.22s ease forwards;
}
```

退出关键帧在:1248固定 `from { transform: translateX(0); }`。本地两帧后关闭，X约720px瞬间回到136px附近再退出。`D:/project/b2c-store/src/modules/home-new/components/QuoteRequestForm.tsx:248–268` 目前用非受控 `<Dialog.Root>` 和Portal。

## Target

使用原生WAAPI对panel完整 `transform` 字符串、overlay opacity做可中断动画，不添加库：enter320ms、exit220ms、curve `cubic-bezier(0.32, 0.72, 0, 1)`；overlay enter200ms、exit150ms，`cubic-bezier(0.23, 1, 0.32, 1)`。reduce：panel transform始终none，opacity enter/exit200ms。上述时长是明确选定的抽屉和popover/反馈预算。

Radix在退出完成后才关闭/卸载；不要对已closed的modal无限forceMount。快速反转读取实际中间画面，不能回固定起点。320ms不是缺陷，修复重点是连续性。

## Repo conventions to follow

保留同文件的Dialog.Trigger、Dialog.Close、Title、Description、表单source与Portal。继续使用现有CSS定位（right0、width min(96vw,960px)、z-index1001）；实现局限于QuoteDrawer。可参考HeroBackground.tsx:49–112的media change/cleanup方式；它不是动画实现模板。

## Steps

1. QuoteDrawer加受控Radix `open={present}` 与 `onOpenChange={requestOpen}`。`present` 表示节点仍存在；另用ref保存最新desiredOpen、递增epoch和各WAAPI Animation引用。关闭请求先运行退出，完成后才 `setPresent(false)`；关闭期间Radix焦点/滚动锁仍正常，完成后由Radix恢复。
2. 给Overlay、Content添加DOM refs，用layout effect在首次present后运行入口。首次入口普通模式明确从 `translateX(100%)`、overlay opacity0开始；写入初始inline样式，确保第一帧不会闪现展开面板。reduce首次transform none、panel opacity0。
3. 每次改变目标先读各元素的 `getComputedStyle`，把当前transform/opacity写进inline style，再cancel旧Animation。新动画从该快照到目标，WAAPI `fill: "forwards"`。不要先cancel再读取，否则会回到基底样式。普通panel展开目标 `translateX(0)`、退出目标 `translateX(100%)`；overlay目标1/0。
4. 每次请求增加epoch；只允许当前epoch且desiredOpen仍false的退出finished回调关闭Radix。cancel产生的AbortError正常吞掉。入口完成写入终态inline值再cancel，避免累积fill动画。`requestOpen(true)`在closing时取消退出并从当前画面回展开；测试这个重入路径，即使常规UI没有重入触发器。
5. 监听reduce change；动画途中也从当前画面重新定位到transform none，并完成opacity目标。effect清理、组件卸载时取消Animation、清理media listener；不得让旧回调卸载新入口。
6. 删除这两类drawer/overlay的CSS data-state keyframe动画和其专属四个keyframes（若001仍引用opacity keyframes，先迁移reduce到WAAPI再删除）。保留尺寸、背景、close button。Root必须在opacity退出完成时卸载，不写固定setTimeout补丁。
7. 窗口宽度变化中：动画的最终目标仍用百分比transform；取消/重定向时以实际computed transform为起点。不得改body或首页布局。

## Boundaries

仅 `QuoteRequestForm.tsx` 与 `home-new.module.css`；禁止改API、表单值/归因、其他Radix组件、Hero、MiniQuote或共享Sheet。不用forceMount长期保留closed modal，不加依赖。漂移先报告。

## Verification

- **Mechanical**：`npx eslint src/modules/home-new/components/QuoteRequestForm.tsx`；`git diff --check`。有意义的浏览器回归覆盖入口50ms时close、出口50ms时requestOpen(true)、连续三次反转，断言X不跳端点且只有最后目标生效。
- **Feel check**：1440/390px，DevTools10%播放；开始展开立刻Escape/Close/点overlay，面板从当前X连续向右退出；重复操作无闪白、蒙层残留或重复锁滚动。检查Tab焦点限制、退出后触发器焦点恢复。
- 动画期间切reduce、切路由卸载、调整viewport，确认无未处理AbortError。打开/关闭 `/products` 和 `/about` 中共享询价入口。
- **Done when**：连续性与资源清理检查通过；reduce只有淡入淡出；表单不需真实提交即可完成验收。

## 实施记录（2026-10-05）

最终实现：抽屉与新增工厂图库共用模块局部 useAnimatedDialog.ts，保持Radix受控退出，不复制生命周期逻辑；这增加了一个局部hook文件，未修改全局组件或API。

本地开发/生产预览回归、定向lint、首页数据测试和production build已核查；详细证据见 [实施验收](./homepage-motion-implementation.md)。真实手机手感未做实机验收，触屏验证使用浏览器模拟。未部署。
