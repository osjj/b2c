# LAIFAPPE 内部报价工作台：实现计划 v0.2

> 文档状态：评审草案，尚未批准开发  
> 编写日期：2026-08-29  
> 适用项目：`D:\project\b2c-store`  
> 依赖方案：[2026-08-29-quotation-workbench-prd.md](./2026-08-29-quotation-workbench-prd.md) v0.2  
> 当前授权边界：只生成实现计划；不创建 Trellis task、不写数据库迁移、不安装依赖、不修改功能代码、不上传或导入真实报价文件、不部署生产。

## 1. 实施结论

### 1.1 总体路线

在现有 `b2c-store` 中建立独立的 `quotation` 领域模块，分两个开发里程碑交付首个可用版本：

- **阶段 A：手工闭环**——报价产品、客户、报价编辑、版本状态、私有文件和 PDF/Excel 正式定稿；
- **阶段 B：本地草稿导入**——Excel、文本型 PDF、人工检查、三种导入模式和历史价格查询。

阶段 A 只是内部里程碑；只有阶段 A 与阶段 B 均验收通过，才称为首个可用版本。

### 1.2 AI定位

首个可用版本不依赖 AI：

- Excel 和文本 PDF 使用确定性解析；
- 金额、版本、权限、文件、审计和导出完全由程序控制；
- 扫描 PDF/图片的 OCR、视觉提取、相似产品和翻译放入阶段 C；
- 阶段 A/B 只预留解析器接口和字段证据结构，不调用 AI API。

### 1.3 现有功能保护

第一轮实现不修改以下公开业务行为：

- 现有商城 `Product`、`ProductImage`、`PriceTier`；
- 现有客户询价 `Quote`、`QuoteItem` 和 `/quote`；
- 现有 `/tools/ai-quote` 的公开行为；
- 现有订单、账号、博客、Solution 和 SEO 页面。

新模块只通过可空外键与 `Product`、`Quote` 建立可选关系，不反向要求现有数据迁移。

## 2. 开发开始前的审批门

以下审批全部满足后，才能创建 Trellis task：

| 编号 | 审批项 | 推荐默认 | 未确认时的处理 |
| --- | --- | --- | --- |
| G0-1 | PRD v0.2 总体方向 | 通过 | 不进入开发 |
| G0-2 | 首版文件范围 | `.xlsx/.xls`、文本 PDF 自动解析；扫描 PDF 和单张 PNG/JPEG/WebP 对照预览、手工录入 | 不开发导入解析 |
| G0-3 | 报价编号 | `YLF-YYYYMMDD-NNN` | 编号模块仅做接口，不迁移 |
| G0-4 | 首版模板 | 按PRD支持中文、英文、双语3个固定模板；如缩小为两个单语模板，必须同步批准PRD变更 | 不开发正式定稿 |
| G0-5 | 客户版图片 | 默认主图；可按行选择更多图片 | 模板保持占位 |
| G0-6 | 费用结构 | 行折扣、报价折扣、运费、其他费用、单一价外税、舍入 | 金额 code-spec 不冻结 |
| G0-7 | 内部成本 | 供应商、采购币种、成本、人工汇率、利润率；仅 ADMIN 可见 | 不开放成本字段 |
| G0-8 | 文件保留 | 已确认/已定稿长期保留；未确认无引用批次 30 天清理 | 不启用自动清理 |
| G0-9 | 邮件 | 首版只下载，由用户自行发送并手工标记已发出 | 不接入邮件 |
| G0-10 | 生产部署 | 另行确认 | 只做本地/测试环境 |

另外必须由用户提供或批准制作一套脱敏样本：

- 结构清晰的 `.xlsx`；
- 有多个工作表和合并单元格的 `.xlsx`；
- 有内嵌图片或 `DISPIMG(...)` 的工作簿；
- 一个旧 `.xls`；
- 一个文本型 PDF；
- 一个扫描 PDF 和一张 PNG/JPEG/WebP 报价图片；
- 一个历史报价样本，包含客户、联系人、日期、旧编号、币种、贸易条款、付款方式、有效期、源文件性质、源总金额和产品行；
- 一个带中文、英文、长规格、多页和多图片的导出样本。

不得直接把签名、公章、客户联系方式或真实采购价提交到仓库测试样本中。

## 3. Trellis任务建立计划

用户批准开发后，先建立一个新的 fullstack Trellis task，建议目录名：

```text
.trellis/tasks/08-29-quotation-workbench/
```

任务建立时执行但本轮不执行：

```powershell
python ./.trellis/scripts/task.py create "quotation-workbench" --priority P1
python ./.trellis/scripts/task.py init-context ".trellis/tasks/08-29-quotation-workbench" fullstack
python ./.trellis/scripts/task.py start ".trellis/tasks/08-29-quotation-workbench"
```

如果实际脚本参数与当前 Trellis 版本不同，先查看 `task.py --help`，不得凭计划文档强行执行错误命令。

`prd.md` 应引用本实现计划和 PRD v0.2，并明确：

- 阶段 A/B 范围；
- 生产部署不在默认授权内；
- 不自动导入真实历史报价；
- 不自动写入正式 `Product`；
- AI 属于阶段 C；
- implementation/check agent 不提交 git commit。

## 4. 代码规范与可执行code-spec

### 4.1 必须加入任务上下文的现有规范

- `.trellis/spec/backend/index.md`；
- `.trellis/spec/backend/type-safety.md`；
- `.trellis/spec/backend/database.md`；
- `.trellis/spec/backend/authentication.md`；
- `.trellis/spec/backend/logging.md`；
- `.trellis/spec/backend/performance.md`；
- `.trellis/spec/backend/quality.md`；
- `.trellis/spec/frontend/index.md`；
- `.trellis/spec/frontend/api-integration.md`；
- `.trellis/spec/frontend/components.md`；
- `.trellis/spec/frontend/state-management.md`；
- `.trellis/spec/frontend/type-safety.md`；
- `.trellis/spec/frontend/quality.md`；
- `.trellis/spec/shared/typescript.md`；
- `.trellis/spec/shared/code-quality.md`；
- `.trellis/spec/guides/cross-layer-thinking-guide.md`；
- `.trellis/spec/guides/pre-implementation-checklist.md`。

当前 Trellis 通用规范中的 Drizzle/better-auth 示例不能覆盖本仓库已使用的 Prisma/NextAuth 实际模式。实现时以以下当前代码为兼容基线：

- `prisma/schema.prisma`；
- `src/lib/prisma.ts`；
- `src/lib/auth.ts`、`src/lib/auth-utils.ts`；
- `src/actions/admin/quotes.ts`；
- `src/app/api/upload/route.ts`；
- `src/lib/r2.ts`；
- `src/components/admin/sidebar.tsx`；
- `src/components/admin/pagination.tsx`；
- `src/components/tools/ai-quote/ExportButtons.tsx`，只作为现有导出能力参考，不作为正式文件实现。

### 4.2 新增项目code-spec

正式写功能代码前，先新增并评审以下规范文件：

| 文件 | 必须定义的内容 |
| --- | --- |
| `.trellis/spec/shared/quotation-domain.md` | 术语、状态机、金额公式、币种精度、快照和可见性 |
| `.trellis/spec/backend/quotation-persistence.md` | Prisma模型、索引、外键、删除行为、事务、乐观锁、幂等 |
| `.trellis/spec/backend/quotation-private-files.md` | 私有R2、隔离区、安全扫描、签名URL、缓存、保留和清理 |
| `.trellis/spec/backend/quotation-import.md` | 三种导入模式、批次状态、解析器契约、证据、部分提交和历史导入原子性 |
| `.trellis/spec/frontend/quotation-workbench.md` | 页面、表格、编辑状态、错误显示、内部/客户字段隔离和危险操作确认 |
| `.trellis/spec/shared/quotation-artifacts.md` | PDF/Excel模板、图片策略、禁显字段、结构和视觉验证 |

同时更新对应 `index.md`，使规范可被任务上下文发现。

code-spec 完成门槛：

- 每个 Zod 输入/输出字段已定义；
- 每个状态转换有前置条件、成功结果和错误码；
- Prisma 字段精度、索引、约束和 `onDelete` 已定义；
- 金额计算至少有一组 Good/Base/Bad 数字示例；
- 文件安全状态和 fail-closed 行为已定义；
- 导入三种模式都有幂等键与事务边界；
- 客户版禁显字段有自动测试清单。

## 5. 技术可行性验证阶段

这些验证按交付阶段设置阻断门，不要求五项全部完成后才能开始阶段 A：

- 阶段 A 阻断：Spike 2（正式文件）和 Spike 3（私有文件）；
- 阶段 B 阻断：Spike 1（Excel）、Spike 4（后台任务）和 Spike 5（文本 PDF）；
- Spike 2 若证明正式文件生成超过当前请求时限，则 Spike 4 自动提前为阶段 A 阻断项。

验证代码只放在 Trellis task 临时目录或独立 spike 目录；结论确认后删除无用实验文件，保留简短报告。

### Spike 1：`.xlsx/.xls` 与图片提取

目标：确认首版承诺的格式能否在生产运行环境可靠解析。

验证项：

- `.xlsx` 工作表、合并单元格、公式、公式缓存值；
- Excel drawing 内嵌图片及其锚点；
- `DISPIMG(...)` 的可识别边界；
- 旧 `.xls` 的单元格、公式显示值和图片；
- 错误公式 `#REF!/#NAME?/#VALUE!`；
- 文件大小和解压体积限制；
- 外部链接、宏、公式注入和主动内容的处理边界。

建议候选：

- 读取单元格：现有 `xlsx`；
- `.xlsx` 图片与输出：`exceljs`；
- 必要时只读 OOXML relationship 解析；
- 不购买或引入商业库前先取得用户批准。

退出条件：

- `.xlsx` 样本达到字段和图片来源定位要求；
- `.xls` 若无法可靠提取内嵌图片，停止并回到用户评审，将首版范围调整为“`.xls` 文本/表格 + 图片手工补充”，不能静默降级。

### Spike 2：中文、英文、双语PDF与带图Excel生成

目标：选择能够服务端生成、复现和校验的正式文件技术。

候选方案：

- PDF：优先验证 `@react-pdf/renderer` 配合本地授权字体；
- Excel：优先验证 `exceljs` 的样式、分页、图片和公式结果；
- 现有浏览器 `jsPDF/xlsx` 仅保留预览，不作为正式文档证据。

样本要求：

- 20 个产品、至少 2 页；
- 中文、英文、双语三个固定模板分别生成；
- 长产品名和逐条规格；
- 多图片、Logo、签名和公章；
- 页眉、跨页表头、页码、总金额；
- 客户版不出现成本、利润、供应商链接和内部备注。

退出条件：

- PDF 渲染和文本抽取均正确；
- Excel 用桌面 Excel/兼容渲染器打开无新增公式错误；
- 客户提供的以 `=`, `+`, `-`, `@` 开头的文本在导出时不会被当作可执行公式；
- 生成文件有稳定 SHA-256；
- 失败时不产生 `FINALIZED` 状态。

### Spike 3：私有文件、安全扫描与签名URL

目标：确认报价文件不会沿用当前公开 R2 URL。

验证项：

- 独立私有 R2 bucket 或隔离配置；
- quarantine 与 clean object key 前缀；
- magic bytes 校验；
- 恶意文件扫描实现；
- 5 分钟签名 URL；
- `Cache-Control: private, no-store`；
- 匿名和非管理员下载失败；
- 过期 URL 失败；
- 文件清理和审计。

安全扫描提供方未确定前，生产文件上传必须保持关闭。不得把真实客户文件提交给未经批准的第三方扫描服务。

### Spike 4：可靠后台任务

目标：选择能够在当前部署环境可靠执行解析任务的方式。

需要先确认部署形态：长期 Node 进程、容器、VPS、serverless 或其他。

候选方向：

- 有独立 worker 进程：PostgreSQL-backed job worker；
- serverless：受支持的持久队列/任务服务；
- 只用 Next.js 请求后的非持久回调不满足可靠任务要求。

退出条件：

- 上传后 5 秒内返回 batch ID；
- worker 中断后任务可恢复或安全重试；
- 重试不重复创建导入行或业务数据；
- 任务状态至少包括 queued/running/review_required/failed；
- 日志不包含源文件正文、签名 URL 或密钥。

### Spike 5：文本PDF提取和预览

目标：验证文本层、表格定位、页码证据和浏览器预览。

建议验证 `pdfjs-dist` 或同等可维护方案：

- 提取文字、坐标和页码；
- 区分文本 PDF 与扫描 PDF；
- 不对扫描 PDF 自动调用 AI；
- 不执行 PDF JavaScript、嵌入动作或外部资源；
- 100 页限制内可排队处理；
- 页面预览使用管理员鉴权的私有数据源。

## 6. 建议新增依赖

只有 Spike 通过且用户批准开发后才安装。

| 依赖 | 用途 | 是否首版必需 |
| --- | --- | --- |
| `decimal.js` | 服务端/客户端一致的十进制金额计算 | 是 |
| `file-type` | magic bytes 检测 | 是 |
| `@aws-sdk/s3-request-presigner` | 私有对象短期签名URL | 是 |
| `exceljs` | `.xlsx` 图片解析和正式Excel输出 | Spike决定 |
| `pdfjs-dist` | 文本PDF提取与页面证据 | Spike决定 |
| `@react-pdf/renderer` | 服务端正式PDF | Spike决定 |
| 后台任务库 | 持久任务队列 | 部署Spike决定 |
| 安全扫描客户端 | 文件扫描 | 安全Spike决定 |

依赖要求：

- 锁定确切版本并提交 lockfile；
- 检查许可证与服务端运行兼容性；
- 不依赖未声明的传递依赖；
- 安装后分别跑 lint、typecheck、目标测试和 build；
- 不为了扫描/OCR把客户文件默认发给第三方。

## 7. 阶段A任务拆分：手工报价闭环

### A0：冻结领域契约

**依赖：** 审批门、code-spec、阶段 A 阻断 Spike。  
**复杂度：** M。

工作：

1. 冻结 Prisma model、enum、索引和删除行为；
2. 冻结 Zod schemas 与错误码；
3. 冻结金额公式和状态转换；
4. 冻结私有文件环境变量；
5. 形成数据库迁移和回滚说明；
6. 将 Good/Base/Bad 用例映射到测试文件。

验收：实现代理无需自行决定任何业务字段或状态语义。

### A1：Prisma schema 与迁移

**依赖：** A0。  
**复杂度：** XL。

预计修改：

- `prisma/schema.prisma`；
- `prisma/migrations/<timestamp>_quotation_workbench_foundation/migration.sql`；
- 必要时 `prisma/seed-quotation-dev.ts`，只生成虚构开发数据。

预计新增模型：

1. `BusinessCustomer`；
2. `BusinessCustomerContact`；
3. `QuotationProduct`；
4. `QuotationProductImage`；
5. `QuotationProductSource`；
6. `QuotationProductCostRecord`；
7. `SalesQuotation`；
8. `SalesQuotationRevision`；
9. `SalesQuotationItem`；
10. `SalesQuotationItemAsset`；
11. `SalesQuotationDocument`；
12. `QuotationAuditLog`；
13. `QuotationBrandAsset`，保存Logo/签名/公章的私有对象引用；
14. `QuotationSourceFile`，阶段 A 先支持手工来源、品牌资产和私有文件元数据；
15. `QuotationNumberCounter` 或等价的并发安全编号机制；
16. `QuotationFinalizationAttempt`，保存定稿幂等键、租约、心跳、状态和失败摘要。

预计 enum：

- `QuotationProductStatus`；
- `SalesQuotationOutcomeStatus`；
- `SalesQuotationRevisionState`；
- `QuotationDocumentType`；
- `QuotationAssetType`；
- `QuotationAuditAction`。
- `QuotationFileSecurityStatus`。
- `QuotationFinalizationStatus`。

`QuotationDocumentType` 至少固定区分 `SNAPSHOT_JSON`、客户 PDF、客户 Excel 和内部核价 Excel；`SNAPSHOT_JSON` 是正式版本资产，不是临时调试文件。

关键约束：

- 报价号唯一；
- `salesQuotationId + revisionNumber` 唯一；
- `QuotationProduct.nameZh/nameEn` 至少一个非空；
- `SalesQuotationItem.quotationProductId/productId` 最多一个有值；
- 销售币种只在 revision 保存；
- version 乐观锁字段默认 1；
- 已发历史通过业务逻辑禁止删除；
- 与已发版本相关的文件和资产使用 `RESTRICT`；
- 新增外键不得要求现有 `Product` 或 `Quote` 回填。

Prisma无法直接表达的约束必须写进 migration SQL 的数据库 `CHECK`，并在 Zod/service 层重复校验；不能只在文档里描述。

索引至少覆盖：

- 报价产品内部编号、名称、型号、状态、更新时间；
- 客户公司名、国家、邮箱和更新时间；
- 报价号、客户、业务结果、创建时间；
- revision 状态、报价日期、有效期；
- 报价行的产品来源和名称；
- 文档 hash、source file hash；
- 定稿 attempt 的 idempotency key、状态、租约到期时间；
- 审计对象类型、对象 ID、创建时间。

迁移验证：

```powershell
npx prisma format
npx prisma validate
npx prisma generate
```

并在匿名化数据库副本验证：

- 迁移前后现有表行数不变；
- 现有产品、询价、订单可读取；
- 新表为空；
- migration 可重复在干净数据库部署；
- 阶段 A 的 `QuotationSourceFile` 字段允许为空且默认值兼容旧记录，不要求任何现有表或文件回填；
- 回滚采用数据库备份恢复或显式逆向 SQL；不得依赖 `prisma db push` 回滚生产。

### A2：领域schemas、金额与状态机

**依赖：** A0；可与 A1 在不冲突文件上并行。  
**复杂度：** L。

预计新增：

```text
src/lib/quotation/schemas.ts
src/lib/quotation/money.ts
src/lib/quotation/currency.ts
src/lib/quotation/state-machine.ts
src/lib/quotation/numbering.ts
src/lib/quotation/visibility.ts
src/lib/quotation/errors.ts
```

要求：

- Zod-first，再从 schema 推断类型；
- `decimal.js` 处理数量、单价、费用、税、汇率和利润；
- 服务端重新计算，忽略客户端提交的总计；
- 每个 revision 单一销售币种；
- 保存 `currencyMinorUnit` 和 `roundingMode`；
- 行折扣固定额/百分比互斥；
- 报价折扣固定额/百分比互斥；
- 首版单一报价级价外税；
- 缺少成本/汇率时利润率返回 `null`，不是 0；
- 状态机覆盖撤回、定稿、未发送纠错、发送、修订、接受、拒绝和取消。

测试：

```text
src/lib/quotation/money.test.ts
src/lib/quotation/state-machine.test.ts
src/lib/quotation/schemas.test.ts
src/lib/quotation/numbering.test.ts
src/lib/quotation/visibility.test.ts
```

必须覆盖 USD/CNY 两位小数、三位小数币种、零数量、负数、超精度、不同销售币种、缺失汇率和并发编号。

### A3：私有文件基础设施

**依赖：** Spike 3、A0。  
**复杂度：** XL。

预计新增：

```text
src/lib/quotation/private-storage.ts
src/lib/quotation/file-validation.ts
src/lib/quotation/file-security.ts
src/lib/quotation/file-retention.ts
src/lib/quotation/object-keys.ts
src/app/api/admin/quotation-files/upload/route.ts
src/app/api/admin/quotation-files/[id]/download/route.ts
```

要求：

- 不复用返回公共 URL 的 `uploadToR2`；
- 数据库保存 object key，不保存永久签名 URL；
- 上传先到 quarantine，扫描为 `CLEAN` 后才能解析/预览；
- 扩展名、MIME、magic bytes、大小、页数、像素和解压体积校验；
- 首版拒绝宏启用工作簿和未批准的主动内容；
- PDF 预览禁用脚本、嵌入动作和外部资源自动加载；
- 下载每次重新鉴权 `ADMIN`；
- URL TTL 5 分钟；
- `private, no-store`；
- 记录 SHA-256、上传人和审计；
- 定稿资产 object key 不可覆盖；
- 未配置扫描器时生产上传 fail closed。

测试：匿名、CUSTOMER、过期 URL、错误 MIME、超限文件、重复 hash、扫描失败、清理无引用文件、保护已定稿资产。

### A4：数据访问、服务层与审计

**依赖：** A1、A2、A3。  
**复杂度：** XL。

预计新增：

```text
src/lib/quotation/repositories/customers.ts
src/lib/quotation/repositories/products.ts
src/lib/quotation/repositories/quotations.ts
src/lib/quotation/repositories/documents.ts
src/lib/quotation/services/audit.ts
src/lib/quotation/services/finalize.ts
src/actions/admin/business-customers.ts
src/actions/admin/quotation-products.ts
src/actions/admin/sales-quotations.ts
```

要求：

- 所有入口先执行 ADMIN 鉴权；
- Server Action 输入和输出均经过 Zod；
- 业务操作在 service 层，不在 React 页面中直接写 Prisma；
- `expectedVersion` 乐观锁；
- 关键状态变更与审计日志同事务；
- 新编号在事务中生成；
- 定稿采用 `READY -> FINALIZING -> FINALIZED`；
- 生成失败回 `READY`，不产生伪成功文档；
- 已 `FINALIZED` 内容不可修改；
- 已 `ISSUED` 只能在 outcome=OPEN 时创建修订；
- 更换客户复制为新报价号；
- 删除/归档遵守引用关系和审计。

建议统一错误码：

- `UNAUTHORIZED`；
- `FORBIDDEN`；
- `NOT_FOUND`；
- `VALIDATION_FAILED`；
- `VERSION_CONFLICT`；
- `INVALID_STATE_TRANSITION`；
- `CURRENCY_MISMATCH`；
- `FILE_NOT_CLEAN`；
- `FILE_TOO_LARGE`；
- `DUPLICATE_FILE`；
- `DOCUMENT_GENERATION_FAILED`；
- `DOCUMENT_VALIDATION_FAILED`；
- `IMMUTABLE_REVISION`；
- `REFERENCED_RECORD`；
- `INTERNAL_ERROR`。

错误响应不得包含 Prisma SQL、存储密钥、签名 URL 或客户文件正文。

### A5：实际客户资料库

**依赖：** A4。  
**复杂度：** M。

预计新增：

```text
src/app/admin/business-customers/page.tsx
src/app/admin/business-customers/new/page.tsx
src/app/admin/business-customers/[id]/page.tsx
src/components/admin/quotation/customer-form.tsx
src/components/admin/quotation/customer-filters.tsx
```

要求：

- 不直接改造当前演示 `/admin/customers`；
- 公司与联系人分开；
- 一个客户多个联系人；
- 重复客户只提示，不自动合并；
- 客户修改不改变历史 revision 的客户快照；
- 列表支持分页、公司、国家、邮箱和状态筛选；
- 归档客户不影响历史报价。

### A6：报价产品资料库

**依赖：** A4。  
**复杂度：** L。

预计新增：

```text
src/app/admin/quotation-products/page.tsx
src/app/admin/quotation-products/new/page.tsx
src/app/admin/quotation-products/[id]/page.tsx
src/components/admin/quotation/product-form.tsx
src/components/admin/quotation/product-images.tsx
src/components/admin/quotation/product-cost-history.tsx
src/components/admin/quotation/product-quote-history.tsx
```

要求：

- 名称中英文至少一个；
- SKU、型号、MOQ、标准和证书均可为空；
- 内部编号系统生成，不冒充供应商型号；
- 图片、规格、供应商、采购记录和来源分区；
- 标准/证书字段无来源时保持空白；
- 报价产品更新不改变历史报价行；
- `INACTIVE` 替代含义重叠的软删除；
- 只有从未被引用的空草稿可物理删除；
- 搜索不依赖正式 `Product` 向量。

### A7：报价编辑器与版本页面

**依赖：** A4、A5、A6。  
**复杂度：** XL。

预计新增：

```text
src/app/admin/sales-quotations/page.tsx
src/app/admin/sales-quotations/new/page.tsx
src/app/admin/sales-quotations/[id]/page.tsx
src/app/admin/sales-quotations/[id]/edit/page.tsx
src/components/admin/quotation/quotation-editor.tsx
src/components/admin/quotation/quotation-lines.tsx
src/components/admin/quotation/quotation-totals.tsx
src/components/admin/quotation/revision-timeline.tsx
src/components/admin/quotation/status-actions.tsx
```

要求：

- 支持报价产品、正式 Product、一次性临时行；
- 报价行保存完整快照；
- 修改行不回写资料库；
- 可显式“保存当前行为报价产品”；
- 表格支持拖动排序和固定关键列；首版只支持从电子表格按固定列顺序粘贴 tab/newline 纯文本，并在写入前预览；智能列映射、任意格式批量导入和复杂批量编辑留到阶段 C；
- 内部成本与客户可见字段视觉隔离；
- 前端总额仅预览，保存后显示服务端结果；
- 自动保存必须带 expectedVersion；
- 冲突时显示差异/刷新提示，不覆盖；
- 危险状态操作二次确认；
- `READY` 可撤回；
- `FINALIZED` 纠错采用作废并复制；
- 更换客户采用复制为新报价。

### A8：正式PDF/Excel与不可变资产

**依赖：** Spike 2、A3、A4、A7。  
**复杂度：** XL。

预计新增：

```text
src/lib/quotation/artifacts/pdf.tsx
src/lib/quotation/artifacts/excel.ts
src/lib/quotation/artifacts/snapshot.ts
src/lib/quotation/artifacts/template.ts
src/lib/quotation/artifacts/validate.ts
src/lib/quotation/artifacts/fonts.ts
src/components/admin/quotation/quotation-preview.tsx
scripts/validate-quotation-artifacts.mjs
```

定稿步骤：

1. 事务检查 revision=READY 和 expectedVersion；
2. 转 FINALIZING；
3. 服务端重算金额；
4. 把客户版图片复制到 revision 专属不可变 staging object key；正式商品远程图片只允许从批准的 HTTPS/R2 域名读取，并限制大小、重定向、超时和内容类型，防止 SSRF；
5. 从锁定输入生成规范化、字段顺序稳定的 snapshot JSON；
6. 按 revision 锁定的语言选择，从同一 snapshot 生成中文、英文或双语客户 PDF 和客户 Excel；
7. 检查 snapshot schema，以及 PDF/Excel 中的报价号、客户、币种、总金额、页数、图片数和禁显字段；
8. 把 `SNAPSHOT_JSON`、客户PDF和客户Excel写入私有存储并分别记录 SHA-256；
9. 写 `SalesQuotationDocument`；
10. 原子记录最终 object key，事务转 FINALIZED 并写审计；
11. 用户实际发送后手工标记 ISSUED。

失败补偿：

- 任一步失败都把 revision 恢复为 READY；
- 删除或标记待清理的 staging objects；
- 不留下可下载但无数据库记录的正式文件；
- 定时 reconciliation 检查超时停留在 FINALIZING 的 revision、孤立对象和半成品文档；
- 如果 Spike 2 表明生成时间不适合请求内完成，则 A8 依赖 Spike 4 的持久 worker，不使用非持久回调凑合。

并发和恢复：

- 每次定稿创建唯一 `finalizeAttemptId` 和客户端不可重复使用的 idempotency key；
- attempt 获取有到期时间的租约并定期心跳；
- revision 状态更新使用 `id + expectedVersion + state` 条件；
- 重复点击返回同一有效 attempt，不启动第二套生成；
- reconciliation 只接管租约已过期的 attempt，不能与仍有心跳的 worker 同时处理；
- 安全重试复用已验证且 hash 一致的 staging asset，其他半成品先清理；
- snapshot JSON 可单独通过 schema 和 hash 复现 PDF/Excel 输入。

远程图片安全策略：

- 优先从数据库中受控 object key 复制，不接受任意用户输入 URL；
- 每次 HTTP 重定向都重新检查 scheme、host 和解析后的 IP；
- 拒绝 loopback、private、link-local、multicast 和 metadata 地址；
- DNS 解析和连接目标需要防止 rebinding；
- 覆盖超时、最大字节、最大重定向次数和 MIME 白名单测试。

客户版禁显：采购价、成本、利润、供应商链接、内部备注、内部文件 key、审计信息。

内部核价 Excel 必须明显标记 `INTERNAL`，文件类型、权限和下载入口与客户文件分开。

### A9：工作台、导航和历史查询

**依赖：** A5-A8。  
**复杂度：** M。

预计修改/新增：

```text
src/components/admin/sidebar.tsx
src/app/admin/quotation-workbench/page.tsx
src/components/admin/quotation/dashboard-cards.tsx
src/components/admin/quotation/history-table.tsx
```

导航建议新增一个 Quote Workbench 分组：

- Overview；
- Quotation Products；
- Business Customers；
- Sales Quotations；
- Imports。

不得替换现有 `/admin/quotes`；现有 Quotes 继续表示客户询价。

历史查询必须显示客户、日期、数量、单位、币种、单价、状态和来源；不同币种不自动换算比较。

### A10：阶段A集成验收

**依赖：** A1-A9。  
**复杂度：** L。

必须通过：

- 手工创建客户和多个联系人；
- 手工创建无正式 Product 的报价产品；
- 新建含报价产品、正式 Product 和临时行的报价；
- 金额、成本和利润服务端重算；
- READY 撤回；
- FINALIZED 后不可编辑；
- FINALIZED 未发送时作废并复制；
- ISSUED 后 outcome=OPEN 修订；
- 更换客户复制为新报价；
- PDF/Excel 生成、私有下载、5分钟过期；
- 原产品图片更新后旧报价图片仍可复现；
- 客户版无内部字段；
- 现有 Product、Quote、Order 页面回归通过。

阶段 A 验收后暂停，用户检查页面和导出文件。未获确认不进入阶段 B。

## 8. 阶段B任务拆分：本地草稿导入

### B0：冻结导入契约

**依赖：** 阶段A验收、Spike 1/4/5。  
**复杂度：** M。

工作：

- 根据 Spike 1 明确 `.xlsx/.xls` 的实际字段和图片能力；
- 根据 Spike 4 固定 job/worker 部署契约、重试和超时；
- 根据 Spike 5 固定文本 PDF 和扫描 PDF 分流规则；
- 冻结历史报价头字段：客户、联系人、报价日期、源报价号、币种、贸易条款、付款方式、有效期、源文件性质和源总金额；
- 冻结逐行动作：新建报价产品、匹配已有报价产品、仅本次使用、忽略；
- 冻结源总金额与服务端重算总额的差异显示和确认规则；
- 更新 `.trellis/spec/backend/quotation-import.md`；
- 更新导入 Zod schema、状态机、幂等键和错误矩阵；
- 如 Spike 结果需要缩小用户已批准范围，先回到用户评审，不继续 B1。

验收：B1-B7 不需要自行选择解析库、任务系统或 `.xls` 降级方式。

### B1：导入数据模型迁移

**依赖：** B0。  
**复杂度：** L。

新增模型：

1. `QuotationImportBatch`；
2. 扩展阶段 A 已有的 `QuotationSourceFile`，增加批次、解析器和来源定位关系；
3. `QuotationImportRow`；
4. 必要的 job/idempotency 记录；
5. 为 `QuotationProductSource` 增加可空 `importRowId` 关系。

兼容性与关系约束：

- 阶段 A 已有 `QuotationSourceFile` 的新增批次、解析器、来源定位字段全部为 nullable 或具有不改变旧行为的默认值；不得要求阶段 A 数据回填；
- `QuotationProductSource.importRowId` 为 nullable；未由导入产生的报价产品来源保持 `NULL`；
- 来源文件或导入行一旦被报价产品、报价行或历史报价引用，相关外键使用 `RESTRICT`；
- 只对未确认且无业务引用的 staging 行允许随批次清理；批次与临时行的删除行为必须在 code-spec 中逐条固定，不能依靠 ORM 默认值；
- 索引至少覆盖 batch 状态/创建时间、source file hash、source file 的 batch 关系、row 的 batch/状态/动作/行号，以及 `QuotationProductSource.importRowId`；
- 迁移测试必须证明现有阶段 A 来源文件仍可读取、下载和定稿，新增关系均为空且无需回填。

新增 enum：

- `QuotationImportMode`；
- `QuotationImportStatus`；
- `QuotationImportRowStatus`；
- `QuotationImportRowAction`；
- `QuotationJobStatus`。

批次状态至少覆盖：`UPLOADED/PARSING/REVIEW_REQUIRED/PARTIAL/CONFIRMED/FAILED/CANCELLED`。

历史报价模式在最终确认前只保存 staging；所有保留行解决后一次事务创建唯一 `ARCHIVED_IMPORT` 版本。

### B2：持久解析任务与解析器接口

**依赖：** Spike 4、B1。  
**复杂度：** XL。

预计新增：

```text
src/lib/quotation/import/parser.ts
src/lib/quotation/import/job.ts
src/lib/quotation/import/evidence.ts
src/lib/quotation/import/idempotency.ts
src/workers/quotation-import-worker.ts 或部署环境等价入口
```

解析器统一输出：

```text
source location
raw value
normalized suggestion
confidence/status
warnings
image/asset references
parser version
```

首版不用 AI；`confidence` 表示确定性解析完整度，不伪装成统计概率。

任务要求：

- 上传后快速返回 batch ID；
- 可恢复、可重试；
- 每个任务有 idempotency key；
- 同一任务重复执行不重复创建行；
- 进度可见；
- 取消只影响未提交行；
- 日志脱敏。

### B3：Excel解析器

**依赖：** Spike 1、B2。  
**复杂度：** XL。

预计新增：

```text
src/lib/quotation/import/excel-parser.ts
src/lib/quotation/import/excel-images.ts
src/lib/quotation/import/excel-formulas.ts
```

要求：

- 列出所有工作表，要求用户选择目标；
- 保留 sheet 名、单元格范围、行号；
- 公式表达式、缓存显示值、错误值分开；
- 标记 `#REF!/#NAME?/#VALUE!`；
- 合并单元格不丢失显示值；
- 图片关联不明确时待确认；
- `DISPIMG(...)` 无法解析时保留公式和警告；
- 读取时不执行宏、外部数据连接或公式；
- 导出文本执行 spreadsheet formula injection 防护；
- 不修改源文件；
- `.xls` 能力按 Spike 结论执行，不能假装支持图片。

### B4：文本PDF解析器

**依赖：** Spike 5、B2。  
**复杂度：** L。

预计新增：

```text
src/lib/quotation/import/pdf-parser.ts
src/lib/quotation/import/pdf-evidence.ts
```

要求：

- 提取文本、坐标和页码；
- 保留页面预览；
- 识别无文本层并转“手工录入”，不自动调用 AI；
- 表格映射不确定时保留原始块；
- 100页和30MB限制；
- 解析器版本写入批次。

### B5：三种导入提交服务

**依赖：** B1-B4。  
**复杂度：** XL。

预计新增：

```text
src/lib/quotation/import/commit.ts
src/lib/quotation/import/history-header.ts
src/lib/quotation/import/total-difference.ts
src/actions/admin/quotation-imports.ts
```

实现：

1. `PRODUCT_LIBRARY`：只创建/匹配报价产品和来源；
2. `ADD_TO_EXISTING_QUOTATION`：只允许加入指定 DRAFT，可逐行选择是否建档；
3. `HISTORICAL_QUOTATION`：确认完整报价头和全部保留行后，一次事务创建主报价、`ARCHIVED_IMPORT`、全部行、来源和审计。

历史报价提交合同：

- 报价头必须包含客户、联系人、报价日期、源报价号、币种、贸易条款、付款方式、有效期、源文件性质 `DRAFT/ISSUED/UNKNOWN` 和源总金额；
- 每个自动提取的头字段和行字段保留 source file、sheet/cell 或 PDF page/bounding box/text block 证据；人工输入记录 `MANUAL` 来源和操作者；
- 每一行只能选择新建报价产品、匹配已有报价产品、仅本次使用或忽略；不得用相邻行补齐标准、型号、证书或价格；
- 服务端按确认行重算总额，并同时保存源总金额、重算总额和差额；绝不通过修改行金额强行对平；
- 差额不为零时阻止最终确认，直到用户修正数据，或以管理员身份明确接受差额并填写原因；币种最小单位以内的舍入容差按 A0 金额 code-spec 执行；
- 历史报价在最终确认前只保存 staging；确认时全部保留行和报价头全有或全无。

幂等要求：

- batch + row + action 有唯一 idempotency key；
- 成功行重试不会重复；
- 历史报价最终确认只能成功一次；
- 重复文件 hash 只提示，不自动覆盖；
- 撤销不删除已发或被引用数据。

### B6：导入中心与检查界面

**依赖：** B2-B5。  
**复杂度：** XL。

预计新增：

```text
src/app/admin/quotation-imports/page.tsx
src/app/admin/quotation-imports/new/page.tsx
src/app/admin/quotation-imports/[id]/page.tsx
src/components/admin/quotation/import-source-preview.tsx
src/components/admin/quotation/import-header-review.tsx
src/components/admin/quotation/import-row-review.tsx
src/components/admin/quotation/import-summary.tsx
```

要求：

- 创建时选择三种模式；
- `ADD_TO_EXISTING_QUOTATION` 只能选择 DRAFT revision；
- 左侧显示私有来源预览，右侧显示可编辑报价头与产品行；
- 对无文本层扫描 PDF 和单张 PNG/JPEG/WebP，不调用 AI，仍允许逐页/逐图预览并手工新增、编辑、删除 staging 行；
- 手工行使用与解析行相同的字段验证、逐行动作、证据和提交服务，不能绕开审计；
- 行动作：新建产品、匹配已有、仅本次、忽略；
- 缺失/模糊/冲突明确标记；
- 报价头完整显示客户、联系人、报价日期、源报价号、币种、贸易条款、付款方式、有效期、源文件性质和源总金额；
- 同屏显示服务端重算总额和差额；接受非零差额需要管理员二次确认并填写原因；
- 批量默认值不覆盖已确认值；
- 提交前显示新建、匹配、仅本次、忽略、待解决的精确数量；
- `PRODUCT_LIBRARY` 和 `ADD_TO_EXISTING_QUOTATION` 支持部分提交；
- `HISTORICAL_QUOTATION` 只保存 staging，最终全有或全无确认。

界面调用 B5 的稳定提交合同；B5 不依赖此界面，避免服务与 UI 循环依赖。

### B7：阶段B验收与性能

**依赖：** B1-B6。  
**复杂度：** L。

文件用例：

- 清晰 Excel：10 行，6 新建、3 匹配、1 仅本次；
- 多 sheet Excel：必须由用户选择正确 sheet；
- 错误公式 Excel：不把错误当 0；
- 文本 PDF：证据可定位到页码；
- 扫描 PDF：私有逐页预览，手工录入报价头和产品行，不调用 AI；
- 单张 PNG/JPEG/WebP：私有图片预览，手工录入报价头和产品行，不调用 AI；
- 历史报价：完整报价头、四种逐行动作、证据和总额差异检查后，一次原子创建 `ARCHIVED_IMPORT`；
- 重复任务和重复确认：无重复业务数据。

性能数据集：

- 10,000 报价产品；
- 20,000 报价行；
- 1,000 客户；
- 100 行报价；
- 30MB/100页边界文件。

目标：

- 普通搜索/分页 P95 < 2秒；
- 100行报价加载 P95 < 3秒；
- 上传/排队 5秒内返回 batch ID；
- 长任务至少每30秒更新阶段；
- 重试不重复创建数据。

阶段 B 验收后暂停，用户先评审导入质量。未获新批准不导入全量真实历史文件。

## 9. 阶段C：AI与效率增强（不在首版）

阶段 C 单独创建新 Trellis task，不混入阶段 A/B 的验收。

### C1：AI解析器适配层

```text
src/lib/quotation/ai/provider.ts
src/lib/quotation/ai/schemas.ts
src/lib/quotation/ai/redaction.ts
src/lib/quotation/ai/evidence.ts
```

契约要求：

- AI 输出必须经过 Zod；
- 每个字段关联页码/区域/原图证据；
- AI 只能写 staging 建议；
- 不直接写报价产品、报价或正式 Product；
- 不发明型号、标准、证书、MOQ、数量或价格；
- 供应商和客户敏感信息是否发送给外部模型必须单独批准；
- AI不可用时手工和确定性流程继续工作。

### C2：扫描PDF与图片视觉提取

- OCR/视觉解析；
- 字段级证据；
- 图片与产品行候选；
- 看不清的值保持待确认；
- 超时、限流和失败可重试；
- 同一图片不重复生成业务数据。

### C3：相似产品、翻译和异常提示

- 为 `QuotationProduct` 建立独立搜索/向量索引；
- 相似结果只是候选，不自动合并；
- 中英翻译保存为建议，用户确认后写入；
- 价格异常比较必须带币种、数量、日期和客户上下文；
- 不用正式 `products.embedding` 代替报价产品索引。

## 10. 测试计划

### 10.1 单元测试

使用仓库现有 `node:test` 风格。建议新增 npm script：

```json
{
  "test:quotation": "node --import tsx --test src/lib/quotation/**/*.test.ts"
}
```

实际 glob 在 Windows/Node 环境验证后固定；若 Node test runner 不展开 glob，改为明确文件列表或小型 runner，不在 CI 中依赖 shell 差异。

测试分组：

- schema 边界；
- Decimal 金额；
- 币种精度；
- 状态机；
- 编号并发；
- 乐观锁；
- 可见性和禁显字段；
- object key；
- 文件校验；
- 导入证据；
- parser fixtures；
- 幂等；
- canonical snapshot 字段顺序、schema 版本和确定性 hash；
- PDF/Excel 必须消费同一 snapshot，不能各自重新查询可变业务数据；
- 源总金额差额、舍入容差和管理员接受原因。

### 10.2 数据库集成测试

- 新建/更新/归档客户和报价产品；
- 来源外键互斥；
- revision 编号唯一；
- 关键事务失败全部回滚；
- expectedVersion 冲突；
- FINALIZED/ISSUED 不可修改；
- 历史导入全有或全无；
- `QuotationSourceFile` 扩展字段对阶段 A 旧记录保持 nullable、无需回填，引用后的 source file/import row 删除被 `RESTRICT`；
- 已引用资产不可删除；
- 并发报价编号无重复；
- 定稿 attempt 重复请求返回同一结果，过期租约可接管，有效心跳不可被并发 worker 接管；
- FINALIZED revision 同时存在 schema 有效、hash 匹配的 `SNAPSHOT_JSON`、客户 PDF 和客户 Excel 记录。

测试数据库使用独立 `DATABASE_URL`，禁止连接生产。

### 10.3 Route/Action测试

- ADMIN 成功；
- 未登录/CUSTOMER 被拒绝；
- 所有输入/输出经过 Zod；
- 错误码稳定；
- 响应无敏感信息；
- 私有下载 no-store；
- 过期签名 URL 失败。

### 10.4 浏览器流程测试

新增 Playwright 脚本或正式测试目录，覆盖：

- 客户 CRUD；
- 报价产品 CRUD；
- 混合来源报价；
- 自动保存冲突；
- 状态转换；
- PDF/Excel 下载；
- 三种导入模式；
- 扫描 PDF 与 PNG/JPEG/WebP 对照预览、手工新增和编辑行，全程不调用 AI；
- 历史报价完整头字段、四种逐行动作和总额差异确认；
- 历史查询；
- 现有产品、询价、订单回归。

### 10.5 文档视觉验证

每个模板：

- 渲染 PDF 页面为图片检查；
- 提取 PDF 文本检查报价号、客户、币种、总额；
- 检查禁显字段；
- 检查图片数和跨页；
- 检查 Excel sheet、单元格、图片和公式错误；
- 用保存的 `SNAPSHOT_JSON` 在隔离测试中重建文档输入，验证 schema 版本、hash 和金额一致；
- 保留脱敏 expected manifest，不保留真实客户内容。

## 11. 每个任务的质量门

每个实现任务完成前运行适用命令：

```powershell
npx prisma format
npx prisma validate
npx prisma generate
npm run lint
npx tsc --noEmit
npm run test:quotation
npm run build
```

不是每个纯前端任务都需要执行迁移，但最终阶段门全部执行。

检查要求：

- Implement agent 只实现任务范围；
- Check agent 对照 code-spec 审查并直接修复；
- Backend 完成后执行 backend guideline check；
- Frontend 完成后执行 frontend guideline check；
- 跨层任务执行 cross-layer check；
- 不把无关现有改动回退；
- 不提交 git commit，用户测试后决定提交。

## 12. 数据迁移、回滚和发布

### 12.1 迁移顺序

1. 备份并验证可恢复；
2. 在空数据库运行全部 migration；
3. 在匿名化生产副本运行；
4. 比较现有表结构和关键行数；
5. 部署只读/隐藏导航版本；
6. 管理员小样本测试；
7. 再开放导航入口；
8. 不自动导入历史文件。

### 12.2 回滚原则

- 功能开关可先隐藏新入口；
- 新增表失败优先恢复数据库备份；
- 已创建正式报价后不使用删除表作为普通回滚；
- 文件和数据库回滚必须同步考虑引用；
- 不运行 `git reset --hard`、`prisma db push --force-reset` 或破坏性生产命令；
- 回滚前解析准确数据库和 bucket 目标。

### 12.3 发布前检查

- 环境变量存在但不打印值；
- 私有 bucket 无匿名访问；
- 扫描器工作；
- worker 工作并可恢复；
- 字体授权和部署文件齐全；
- 迁移已执行；
- 管理员鉴权；
- 客户版禁显；
- 现有商城回归；
- 日志无正文、密钥和签名 URL；
- 生产部署获得用户再次明确批准。

## 13. 建议任务依赖图

```text
审批门
  -> Trellis task + code-spec
  -> 阶段A阻断 Spike 2/3
      -> 若 Spike 2 证明必须异步生成：先完成 Spike 4
  -> A0 契约冻结（包含 Spike 2/3，及条件触发的 Spike 4 结论）
      -> A1 数据库
      -> A2 金额/状态/schema
      -> A3 私有文件
          -> A4 服务层/审计
              -> A5 客户
              -> A6 报价产品
                  -> A7 报价编辑器
                      -> A8 正式文档（异步时明确依赖 Spike 4）
                          -> A9 工作台/历史
                              -> A10 阶段A验收
                                  -> 阶段B阻断 Spike 1/4/5
                                  -> B0 导入契约冻结
                                  -> B1 导入迁移
                                      -> B2 后台任务/解析器接口
                                          -> B3 Excel解析
                                          -> B4 PDF解析
                                              -> B5 三模式提交服务
                                                  -> B6 导入检查UI
                                                      -> B7 阶段B验收
                                                          -> 首个可用版本候选

阶段C AI：另立任务，不能阻塞阶段A/B手工流程
```

## 14. 实施期间用户验收点

| 验收点 | 用户需要检查 | 通过后允许 |
| --- | --- | --- |
| U0 方案与默认值 | 本计划和PRD待决策项 | 创建Trellis task，并仅执行已批准的可行性 Spike |
| U1A 阶段A Spike报告 | 私有存储、安全扫描、正式导出，以及是否需要持久 worker | 编写 A0 阶段A数据模型/code-spec 草案；不写迁移与功能代码 |
| U2A 阶段A契约 | 字段、状态、金额、权限、文件和定稿合同 | 执行 A1-A7 阶段A迁移、服务与编辑器开发 |
| U3 阶段A UI | 客户、产品、报价编辑体验 | 执行 A8-A10 正式导出、工作台与阶段A验收 |
| U4 正式文件 | 中文、英文、双语PDF/Excel、snapshot JSON、图片、总额、禁显 | 标记阶段A通过 |
| U1B 阶段B Spike报告 | Excel、文本PDF、扫描件分流和持久任务可行性 | 编写 B0 阶段B导入模型/code-spec 草案；不写阶段B迁移与解析器 |
| U2B 阶段B契约 | 导入字段、证据、任务、总额差异、关系和删除行为 | 执行 B1-B6 阶段B迁移与开发 |
| U5 导入检查 | Excel/PDF字段与证据、扫描件/单图手工录入 | 启用三模式的小批提交验收 |
| U6 小批历史导入 | 完整报价头、四种逐行动作、来源证据、源总额差异和价格历史 | 扩大测试样本 |
| U7 首版候选 | A+B完整回归 | 讨论生产部署 |
| U8 生产发布 | 备份、私有存储、worker、监控 | 单独批准部署 |

任何一个验收点的“通过”只授权下一行所列范围，不自动授权生产部署、全量历史导入或商城产品发布。

## 15. 完成定义

首个可用版本只有同时满足以下条件才算完成：

- 阶段 A 和阶段 B 全部任务完成；
- lint、typecheck、quotation tests 和 build 通过；
- 数据库迁移在空库和匿名化副本通过；
- 私有文件匿名不可访问；
- 文件扫描和持久 worker 可用；
- 手工报价完整闭环通过；
- Excel、文本 PDF 和历史报价导入通过；
- 历史导入幂等且原子；
- PDF/Excel 正式文件通过结构与视觉检查；
- 每个 FINALIZED 版本保存 schema 有效且 hash 匹配的 canonical `SNAPSHOT_JSON`，PDF/Excel 可证明由同一快照生成；
- 已发版本、图片和文件可复现；
- 客户版无内部字段；
- 现有 Product、Quote、Order 和公开页面回归通过；
- 用户已评审首版候选；
- 生产部署仍需单独明确批准。

## 16. 当前不执行事项

本实现计划交付后仍不自动执行：

- 不创建或启动 Trellis task；
- 不安装新依赖；
- 不新增 Prisma migration；
- 不改 admin sidebar；
- 不创建 private bucket；
- 不配置扫描服务或 worker；
- 不读取、上传或导入用户真实本地报价；
- 不调用 AI；
- 不修改公开 `/quote`、`/tools/ai-quote` 或正式 `Product`；
- 不部署生产。

用户明确回复“批准实现计划并开始开发”后，才从审批门和 Trellis task 建立开始；不会跳过 Spike 直接写正式功能。
