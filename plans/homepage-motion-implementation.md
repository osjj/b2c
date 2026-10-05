# 首页动画实施与验收

日期2026-10-05；实现时HEAD为 `aacc5ac`（原审查 `3a2a939`，中间提交只更新采购案例样式）。未提交或部署本次代码。

## 实现

- 001：reduce保护导航、图片hover、按压和弹窗；地图picture选择无CSS/SMIL动画的静态SVG，普通地图原文件不改。
- 002：模块局部 `useAnimatedDialog.ts` 同时服务询价抽屉和工厂图库。Radix保留焦点/滚动锁管理；WAAPI从computed当前值反转，epoch保护过时回调，退出完成再卸载。抽屉入320/出220ms；图库200ms/scale0.97；reduce只淡入淡出。
- 003：移除目标transition:all、gap/width动画；固定间距配箭头transform；图库指示条改scaleX。少量共享参数与Portal完整fallback。
- 004：浮层移动菜单200ms opacity/transform，不推动正文；关闭立即inert；Escape焦点恢复，外点关闭，desktop断点清理。
- 005：fine-pointer hover200ms/scale1.03；静态照片/OEM能力article不移动，绿色点不无限脉冲；OEM四分图3:2和Hero加载/暂停规则保留。
- 新增：按 find-animation-opportunities 完整门槛选择图库开关、150ms成功消息淡入、160ms pointer按压scale0.97。成功文字由持久polite status容器宣布；方向键换图和国家代码选择仍即时。

商业文字、产品数据、导航目标、API/邮件逻辑、归因和数据库均不改。验证成功反馈时浏览器拦截quote-email，未发送询价；测试脚本还拦截外部分析追踪脚本，避免后续mock流程产生外部分析事件。

## 验证

- 定向ESLint（6个新增/修改TS/TSX）通过；独立review无可执行问题；diff空白检查通过。
- `npm run test:home`：5/5通过，缓存、冷读失败和失效行为保留。
- `npm run build`：通过，首页仍为5分钟revalidate静态路由；既有多lockfile workspace-root警告未改配置。
- `npx tsc --noEmit --incremental false`：只有既有5个测试文件错误，body-link-map.test.ts四个excess title、embeddings.test.ts一个missing getEmbeddingConfig。新动画源文件没有类型错误。
- `scripts/home-motion-qa.cjs` 用已安装Chrome测试开发3100与生产预览3101：两个环境各18项检查全部通过，无浏览器错误。覆盖中途关闭/重开、偏好中途改变、焦点恢复/滚动锁释放、route退出清理、静态地图、reduce hover、390/768/1024/1250px菜单、desktop复位、pointer取消/键盘排除、即时方向键照片、mock成功、共享products/about/cases/tools、模拟touch。
- 第一次静态地图检查因lazy图片尚未进入视口，currentSrc为空；测试改为滚入视口并等待实际加载。图库截图同样等待naturalWidth>0，不用空白占位当最终视觉证据。
- 截图分别检查桌面首页、移动菜单、抽屉及已加载工厂图库。真实手机手感没有实机验收；浏览器模拟touch不能替代它。

## 文件与复查

[生产回归JSON](../output/playwright/home-motion/prod-verification.json)、[开发回归JSON](../output/playwright/home-motion/dev-verification.json)、[桌面](../output/playwright/home-motion/prod-desktop.png)、[移动菜单](../output/playwright/home-motion/prod-mobile-menu.png)、[抽屉](../output/playwright/home-motion/prod-quote-drawer.png)、[图库](../output/playwright/home-motion/prod-factory-gallery.png)。

运行本地检查：`node scripts/home-motion-qa.cjs`。生产预览设 `HOME_MOTION_BASE_URL=http://127.0.0.1:3101` 与 `HOME_MOTION_QA_MODE=prod` 后运行同一脚本。

上线需要后续部署；本地生产预览不是公网部署证明。
