# 首页适合新增的动画

2026-10-05；使用 find-animation-opportunities 筛选，再使用 animate 实施。延续首页修复的 `--home-ease-out: cubic-bezier(0.23, 1, 0.32, 1)`；Portal 使用完全一致的fallback。

| # | 位置 | 原状 | 目的 | 频率 | 已选动画 |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/modules/home-new/components/FactoryTourDialog.tsx:15、38` | 工厂图库直接出现/消失 | Preventing a jarring change | 偶发弹窗 | WAAPI：居中 `translate(-50%, -50%) scale(0.97)` 与 `scale(1)`、opacity 0/1，200ms ease-out；overlay入200ms/出150ms；退出同路径并从当前画面反转。reduce只做200ms opacity，保留居中定位。 |
| 2 | `src/modules/home-new/components/QuoteRequestForm.tsx:503` 的成功信息 | 条件插入普通文字 | State indication | 少见的异步完成 | CSS `@starting-style`：opacity0→1，150ms ease-out；不移动表单，持久polite live region宣布实际成功文字；reduce保留轻微淡入。 |
| 3 | `QuoteRequestForm.tsx:254、507`、`FactoryTourDialog.tsx:31、71、80、88`、`NewHomeNav.tsx:132、146` | 无按压反馈 | Feedback | 常用，仅轻微反馈 | CSS + pointer事件类：scale0.97，160ms ease-out；pointerup/cancel/leave/blur释放。图库方向按钮保留垂直定位。键盘不加按压类，reduce取消scale。 |

四项门槛：弹窗低频、用于连接出现/退出、200ms内完成、无数据延迟；成功消息少见、明确表示完成、150ms内完成、文字和表单不移动；按压常用但幅度轻微、表示接收触摸/鼠标、160ms内反馈、不阻止点击或键盘激活。选择的都是transform/opacity，不新增动画依赖。

拒绝的候选：

- 工厂照片方向键切换渐变：输入/频率门槛不通过；保持即时切换，不排队。
- 首页统计数字滚动：功能门槛不通过；商业数字应能立即阅读，不能为了装饰而变化。
- 产品/行业网格逐卡滚动入场：功能门槛不通过；访客在扫描与点击，不隐藏链接或让内容等待。
- OEM四分图缩放/视差：目的和功能门槛不通过；保持3:2完整构图。
- 国家代码搜索结果入场：输入和功能门槛不通过；打字/选择保持即时。

本页没有需新增动画的拖拽、破坏性确认、折叠面板或动态增删列表。背景Hero、现有抽屉/导航/hover修复由001–005负责。

新增动画以工厂图库过渡最有价值。执行者使用原有Radix与原生WAAPI，避免为淡入添加库。验收重点是快速开关/反向、键盘即时换图、pointer取消和reduce模式；自动化通过不等于真实手机手感验收。
