# 报价工作台简化重构：本地交付与上线检查

## 已实现

- 三个入口：报价单、常用产品、报价设置。工作台旧入口转到报价列表。
- 单页填写客户名称、日期、币种、产品名称/图片/描述/数量/单位/单价；可选费用与内部备注。不再要求先建客户或读商城产品库。
- 常用产品维护单名称、描述、单位、默认售价/币种及图片；仅用于填充，不回写历史报价。
- 保存草稿、保存后预览 PDF、确认后生成正式 PDF/Excel。错误内联显示；生成失败/网络不确定时先刷新状态再尝试。
- 复制为新报价或创建修订草稿；保留旧正式文件，不覆盖。
- 报价设置维护抬头、联系方式、页脚、默认币种/条款、Logo 和可选印章。默认不盖章。品牌图片只接受已通过安全检查的私有图片。
- 新横版模板包含大图、规格分栏、长文续页、独立汇总页；不会套用旧 Jordan 报价的交易条款、分组小计或认证声明。

## 数据与业务隔离

本轮没有连接、修改或清理线上数据库，没有部署、推送或修改线上配置。商城商品、订单、询价、用户表未改动。没有 Prisma schema/migration 变化，沿用现有报价表与编号/版本/审计/私有存储设施。

设置使用 `settings` 表的独立键 `quotation.workbench.v2` 与 `quotation.product-defaults.<id>`。原有测试记录未清理；清理应在列出记录 IDs、关联文件及备份方案后单独确认，不能使用 reset/db push --accept-data-loss。

## 验证范围

- 报价单元测试：`node node_modules/tsx/dist/cli.mjs --test src/lib/quotation/*.test.ts`，39 项通过；8 项写入边界测试通过。所有本轮新增/修改的 TS、TSX、MJS 文件 ESLint 通过。
- 真实 Action 写入边界＋内存事务替身：`node scripts/test-quotation-write-boundaries.mjs`；覆盖授权、新建、改名不泄露旧联系人、精确金额、过期版本、外来图片 ID、回滚、正式版不可编辑。**不是 PostgreSQL 集成测试**。
- 实际 React 编辑器隔离浏览器：`node scripts/test-simple-quotation-ui.mjs`；不读取 .env、不调用真实 Server Actions、数据库或 R2。已验证必填错误、常用产品填充、金额显示、PDF 预览、R2 失败反馈与禁止直接重试、390px 窄屏布局。取消确认时保存/生成次数均为 0；模拟成功时保存/生成/刷新各 1 次。真实后端生成及文件下载仍须隔离数据库集成验收。
- 样例 PDF：`node node_modules/tsx/dist/cli.mjs scripts/preview-simple-quotation.ts`，输出 `output/pdf/quotation-v2-preview.pdf`。使用合成产品与示例数据，不是客户报价。两页均已渲染检查。
- 全项目 TypeScript 检查仍存在原有非报价错误：`output/s1p-high-cut-safety-shoes/upload-assets.ts`、`src/lib/body-link-map.test.ts`、`src/lib/embeddings.test.ts`。本次报价改动无新增类型错误。不能据此声称整个生产构建通过。

## 上线前必做（尚未执行）

1. 在隔离测试数据库运行真实创建、保存、上传、预览、生成、下载、复制/修订流程；检查并发版本冲突与回滚。不要让本地调试指向生产 DATABASE_URL。
2. 保留已验证的 `QUOTATION_PRIVATE_STORAGE_PROVIDER=r2-private` 及 `QUOTATION_PRIVATE_R2_*`，目标 bucket 必须私有。此次未改动或验证服务器凭据。
3. 图片上传新增本机 ClamAV 适配器：设置 `QUOTATION_CLAMSCAN_PATH` 为实际 `clamscan` 绝对路径。保持病毒库更新，7 天以上的病毒库、扫描非零退出或超时都会拒绝上传。每应用进程最多一个扫描任务，45 秒超时。需评估服务器内存及 PM2 实例数量后启用；本轮未安装或测试真实扫描器。
4. 本地 ClamAV 使用方式参见 [ClamAV 官方手册](https://github.com/Cisco-Talos/clamav/blob/main/docs/man/clamscan.1.in)。旧的 `QUOTATION_PRIVATE_UPLOADS_SCANNER_ENABLED=true` 不能跳过检查。
5. 中文文件继续使用服务器可用的中文 TTF 或 `QUOTATION_PDF_FONT_PATH`。不能依靠浏览器安装的字体。
6. 单张产品图最多 5 MiB，每条 8 张，正式文件全部产品图总计 20 MiB；Logo/印章分别最多 1 MiB。现有公共图库配置不代替报价私有存储。
7. 解决/确认现有全项目类型错误后，运行生产构建及商城首页、商品详情、购物车、询价/结账只读回归。由用户确认后再发布，并验证远端 commit 与实际运行版本。

## 已知边界

- 此版不是旧 PDF 的逐像素复制：采用相同的横版大图报价方向，统一独立汇总页，支持自动续页。
- 常用产品选择器加载最近 500 个可用产品；产品列表显示最近 100 个并支持搜索。数量增大时可单独增加服务端分页选择器。
- 没有自动解析本地历史 PDF、AI 提取或自动发送邮件；当前重点是简单、可控的手工报价流程。
- 删除草稿图片/行只移除数据库关联，不删除可能被其他报价复用的私有对象。过期孤立上传清理须另行设计保留规则，不能直接按前缀删除。
