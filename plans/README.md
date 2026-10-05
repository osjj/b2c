# LAIFAPPE 首页动画计划

审查日期：2026-10-05。代码基线：`3a2a939`，分支 `b2cOrB2b`。

2026-10-05 用户已批准实施。001–005现已在本地代码落地，另按 find-animation-opportunities / animate 增加工厂图库、成功反馈和pointer按压动画。数据库和线上部署未修改。其他采购案例工作不属于本次范围。

完整证据、优先级和可选机会：[审查报告](./homepage-animation-audit.md)。

| 顺序 | 计划 | 严重程度 | 状态 | 依赖 |
| --- | --- | --- | --- | --- |
| 1 | [001 补齐减少动态效果](./001-home-reduced-motion.md) | MEDIUM | IMPLEMENTED | 无 |
| 2 | [002 让询价抽屉连续反转](./002-interruptible-quote-drawer.md) | HIGH | IMPLEMENTED | 001 |
| 3 | [003 收紧高频交互的动画属性](./003-explicit-home-transitions.md) | HIGH | IMPLEMENTED | 无 |
| 4 | [004 移动菜单使用浮层过渡](./004-mobile-menu-compositor.md) | MEDIUM | IMPLEMENTED | 001 |
| 5 | [005 精简装饰运动和悬停](./005-purposeful-hover-motion.md) | MEDIUM | IMPLEMENTED | 001、003 |

严重程度和执行顺序不同：001 改动集中，影响所有对运动敏感的访客；002 修复已复现的抽屉跳变。003 同时建立本模块动作参数，004/005 使用相同参数或明确 fallback。

每份计划可交给独立执行者，但这些计划共享 CSS 文件，必须顺序实施。每次执行后复核后续计划的旧代码片段。遇到语义漂移先报告，不照旧行号覆盖。

新增机会与拒绝理由见 [机会筛选](./homepage-animation-opportunities.md)。实现及验证见 [实施验收](./homepage-motion-implementation.md)。IMPLEMENTED表示代码实施并完成本地自动化验证，真实手机手感尚未实机验收；不能当成已上线。
