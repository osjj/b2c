# LAIFAPPE 内部报价工作台：产品需求与技术方案 v0.2

> 文档状态：评审草案，尚未批准开发  
> 编写日期：2026-08-29  
> 适用项目：`D:\project\b2c-store`  
> 评审结论：待确认  
> 实施限制：本方案批准前，不创建数据库迁移、不修改功能代码、不导入真实报价、不上传客户文件。

### v0.2 修订摘要

本版根据无上下文读者测试作出以下修订：

- 明确首个可用版本为“阶段 A + 阶段 B”，而不是把开发里程碑 A 单独称为 MVP；
- 将导入拆分为“产品资料导入”“历史报价导入”“加入现有报价”三种模式；
- 区分报价主记录的业务结果与报价版本的制作/发出状态；
- 明确更换客户必须复制为新报价，不能在同一报价号下修订；
- 增加正式文件生成与版本锁定协议，避免出现没有正式文件的已发报价；
- 固化单币种报价、金额精度、计算次序、成本换算和利润公式；
- 增加不可变报价图片资产、产品来源关系和外键互斥规则；
- 明确导入部分提交、私有文件隔离、扫描门槛和默认保留期限。

## 1. 执行摘要

### 1.1 推荐决策

在现有 `b2c-store` 项目中新增一个仅管理员可访问的“内部报价工作台”，但使用独立于商城 `Product` 和客户询价 `Quote` 的领域模型。

报价工作台的主数据来自以下三类来源：

1. 用户本地已有的 Excel、PDF、图片等报价草稿；
2. 报价产品资料库中的内部产品；
3. 可选的商城正式产品。

报价行必须允许完全不关联正式商城产品。任何本地草稿导入后都先进入“待确认区”，经人工检查后才进入报价产品资料库；不得自动写入商城正式产品库。

### 1.2 核心原则

- 商城 `Product` 不是报价系统的必需数据源。
- “客户询价”和“业务正式报价”是两个独立业务对象。
- 报价单保存的是当时的完整快照，后续修改产品资料不能改变历史报价。
- 原始文件、采购价、成本、利润和客户信息属于内部数据，不使用公共文件 URL。
- 自动提取只提供建议；看不清、缺失或冲突的内容必须标记待确认，不得猜测。
- 已正式发出的版本不可原地修改；修改必须产生新版本。
- 从报价产品转为正式商城产品必须由管理员主动确认，默认不同步。

## 2. 背景与问题定义

### 2.1 当前业务情况

用户已有大量本地报价草稿，其中包含尚未录入商城正式产品库的产品。草稿可能分散在 Excel、PDF、图片或其他文件中，产品名称、规格、图片、采购价、客户报价价和条款不完全统一。

目前主要问题：

- 难以快速找到某个产品以前给哪些客户报过价；
- 难以比较相同或相似产品的历史价格；
- 新报价经常需要重新整理图片、参数和条款；
- 本地文件缺少统一的产品身份和来源追踪；
- 旧报价修改后容易覆盖原始版本；
- 商城正式产品库并不包含所有可报价产品；
- 正式产品资料更新后，历史报价内容可能失去当时状态。

### 2.2 当前项目能力与缺口

现有项目已经具备：

- Next.js 管理后台和管理员登录；
- PostgreSQL、Prisma 和产品图片存储能力；
- 商城 `Product`、`ProductImage`、`PriceTier` 等正式商品结构；
- 客户询价 `Quote`、`QuoteItem` 及后台询价列表；
- PDF、Excel 浏览器端导出库；
- R2 文件上传基础设施。

但现有结构不能直接满足内部报价工作台：

- `QuoteItem.productId` 为必填，无法保存未进入正式产品库的报价产品；
- `Quote` 表达的是客户提交询价，不是内部制作的正式报价；
- `/admin/customers` 当前为演示数据，不是实际客户资料库；
- 当前通用上传面向图片，现有询价附件上传不能直接承担内部私密文件存储；
- 现有 AI 报价工具依赖正式 `Product` 的向量检索，且导出仅存在浏览器本地，不是可追踪的正式报价版本。

## 3. 项目目标与非目标

### 3.1 首个可用版本目标

首个可用版本定义为第 17 节的“阶段 A + 阶段 B”。阶段 A 是开发里程碑，不作为满足本项目核心需求的独立交付版本。

首个可用版本必须让用户完成一个闭环：

1. 上传 Excel、文本型 PDF，或手工录入本地报价草稿；
2. 检查系统提取的产品行；
3. 保存为内部报价产品或仅用于当前报价；
4. 选择客户并制作报价；
5. 保存报价版本；
6. 生成并留存 PDF/Excel；
7. 按客户、产品、日期、报价号和价格查询历史。

扫描 PDF 和单张图片在首个可用版本中可以作为私有来源文件保存，并允许用户对照预览手工录入；自动 OCR/视觉提取属于阶段 C，除非用户在评审时明确将其提前。

### 3.2 成功标准

- 未进入商城的产品可以独立建档和报价；
- 用户能够找到产品过去的所有报价价格和客户记录；
- 复制旧报价生成新报价时，不破坏旧版本；
- 导入结果必须经过人工确认，系统不因识别错误直接污染资料库；
- 已发出的报价可复现当时的产品、价格、条款和文件；
- 成本与利润不会出现在客户版导出文件中；
- 报价资料不会自动发布到商城。

### 3.3 首个可用版本非目标

- 不做多公司 SaaS 或多租户计费；
- 不做客户自行登录查看报价；
- 不自动发送邮件或 WhatsApp；
- 不自动抓取实时汇率；
- 不自动把报价转成订单、PI、商业发票或报关单；
- 不承诺任意格式 PDF、扫描件或图片均能 100% 自动识别；
- 不自动合并系统认为相似的产品；
- 不自动同步到商城正式 `Product`；
- 不实现扫描 PDF、图片和旧 `.doc` 的自动结构化提取；
- 不实现报价产品转商城正式产品，只保留后续数据兼容方向；
- 不改造或下线现有公开 `/quote` 和 `/tools/ai-quote`，除非另行批准。

## 4. 用户角色与权限

### 4.1 首个可用版本角色

首个可用版本只开放给现有 `ADMIN` 用户，降低权限模型改造范围。

管理员可以：

- 查看、创建和编辑报价产品；
- 上传和检查本地报价草稿；
- 管理客户资料；
- 创建、修订、作废和导出报价；
- 查看采购价、成本、利润率和来源文件；
- 查看报价产品未来转为正式商城产品的关联状态；首版不执行转换。

### 4.2 后续可扩展角色

- `SALES`：创建和编辑自己的草稿报价，不能查看所有成本；
- `REVIEWER`：审核价格、条款和正式发出版本；
- `FINANCE`：查看收款、PI 和发票相关信息；
- `ADMIN`：全局配置和数据管理。

首个可用版本不预先实现这些角色，但数据表应保留 `createdById`、`updatedById`、`ownerId` 等审计字段，避免后续无法追踪。

## 5. 核心业务术语

| 术语 | 定义 |
| --- | --- |
| 客户询价 `Quote` | 现有商城客户提交的询价请求，保持现状 |
| 报价产品 `QuotationProduct` | 内部报价使用的可复用产品资料，不要求在商城发布 |
| 正式商品 `Product` | 商城中可展示或销售的产品 |
| 报价单 `SalesQuotation` | 一次对客户的商业报价业务记录 |
| 报价版本 `SalesQuotationRevision` | 报价单在某个时间点的不可变版本 |
| 报价行 `SalesQuotationItem` | 某版本中一个产品、数量、价格和规格的完整快照 |
| 导入批次 `QuotationImportBatch` | 一次上传、解析、人工检查和提交过程 |
| 导入行 `QuotationImportRow` | 从源文件提取出的一个待检查产品行 |
| 来源文件 `QuotationSourceFile` | 原始 Excel、PDF、图片或其他证据文件 |
| 客户 `BusinessCustomer` | 报价业务中的公司或个人客户，不等同于商城登录用户 |

## 6. 目标业务流程

### 6.1 从本地草稿导入

创建导入批次时必须先选择一种模式：

1. `PRODUCT_LIBRARY`：只提取可复用产品资料，不创建报价；
2. `HISTORICAL_QUOTATION`：提取旧报价的客户、日期、原报价号、币种、条款、产品行和价格，确认后形成可查询的历史报价；
3. `ADD_TO_EXISTING_QUOTATION`：将确认后的行加入一个指定的现有草稿报价，行可选择建档或仅本次使用。

`HISTORICAL_QUOTATION` 必须由用户确认源文件性质：`DRAFT`、`ISSUED` 或 `UNKNOWN`。系统不能仅凭文件存在就声称报价已发给客户。历史文件原有编号存入 `sourceQuotationNumber`，系统仍生成唯一内部编号。

```text
上传文件到私有隔离区
  -> 文件安全扫描通过后移入私有可用区
  -> 创建导入批次
  -> 解析文本、表格、图片和工作表
  -> 生成待确认行
  -> 显示原始内容与提取结果对照
  -> 用户逐行修正/忽略/匹配已有产品/新建
  -> 用户确认提交
  -> 根据导入模式写入报价产品资料库、历史报价或指定草稿报价
```

约束：

- 上传或解析成功不等于导入成功；
- 只有点击“确认导入”才写入报价产品、历史报价或目标草稿报价等业务数据；
- 未确认批次可删除，不影响已存在的报价产品；
- 同一文件重复上传时根据 SHA-256 提示重复，但不自动覆盖；
- `ADD_TO_EXISTING_QUOTATION` 中的导入行可以选择“不建档，仅加入本次报价”；
- `HISTORICAL_QUOTATION` 除产品行外还必须检查客户、报价日期、币种和来源状态；
- 模糊字段显示置信状态，不用虚构值补全。

### 6.2 手工建立报价产品

管理员可不上传文件，直接创建内部报价产品。最低必填项仅为产品名称；SKU、型号、供应商、MOQ 和标准均可为空。

保存时系统生成内部编号，例如 `QP-2026-000001`。该编号仅用于内部检索，不冒充供应商型号或商城 SKU。

### 6.3 制作新报价

```text
选择或新建客户
  -> 填写报价基础信息
  -> 从报价产品库搜索添加
  -> 可从正式 Product 添加
  -> 可新增一次性临时行
  -> 修改本次报价的品名、规格、图片、数量和单价
  -> 系统计算小计、费用、折扣和总计
  -> 保存草稿
  -> 预览客户版
  -> 生成正式文件并锁定版本
  -> 用户实际发送后标记已发出
```

修改报价行中的文字或价格只影响当前报价版本，不回写报价产品资料库。若用户希望把修改同步到报价产品资料库，必须通过单独的“更新资料库产品”动作并显示差异。

### 6.4 修订旧报价

- 草稿版本可以持续编辑；
- 一旦生成正式文件并进入 `FINALIZED`，该版本锁定；
- 对已发出报价点击“创建修订版”，复制全部快照并将版本号加一；
- 新版本可修改联系人快照、产品、数量、价格或条款，但不能更换客户主体；
- 如需更换客户，必须使用“复制为新报价”，生成新的主报价号；
- 旧版本及其导出文件继续保留；
- 报价主编号不变，版本号变化，例如 `YLF-20260829-001 / Rev.2`。

### 6.5 报价产品转为商城正式产品（阶段 C）

这是独立的后续动作：

1. 用户选择一个报价产品；
2. 系统显示报价字段与商城 `Product` 必填字段之间的映射；
3. 缺少的商城字段由用户补充；
4. 用户明确确认；
5. 创建正式商品，并在报价产品中记录 `promotedProductId`；
6. 原报价产品和历史报价快照继续保留。

该流程不属于首个可用版本。后续实现时默认创建商城“未上架草稿”，是否激活或发布必须另行确认。

## 7. 功能需求

### 7.1 报价工作台首页 `/admin/quotation-workbench`

显示：

- 待检查导入批次数；
- 草稿报价数；
- 即将过期报价数；
- 最近报价；
- 最近使用的报价产品；
- 快捷入口：上传草稿、手工建产品、新建报价、搜索历史。

首个可用版本不展示预测销售额等无法从现有数据可靠计算的指标。

### 7.2 报价产品列表 `/admin/quotation-products`

筛选条件：

- 关键词：中文名、英文名、内部编号、型号、规格、供应商；
- 状态：草稿、已核对、停用、已转正式商品；
- 来源类型：手工、Excel、PDF、图片、正式商品；
- 最近报价日期；
- 供应商；
- 是否有图片；
- 是否有历史报价。

列表字段：

- 主图；
- 内部编号；
- 中文名/英文名；
- 型号；
- 供应商；
- 最近采购价；
- 最近客户报价价和币种；
- 报价次数；
- 状态；
- 最近更新时间。

支持软删除/停用，不直接物理删除已经被报价引用的产品。

### 7.3 报价产品详情 `/admin/quotation-products/[id]`

分区：

- 基本信息；
- 多语言名称和描述；
- 图片；
- 结构化规格；
- 型号/颜色/尺码等可选项；
- 供应商与采购信息；
- MOQ、包装和交期；
- 原始来源文件；
- 历史报价时间线；
- 关联客户和报价；
- 与正式商品的关联状态；
- 修改审计记录。

产品标准、证书、测试报告等字段只记录来源中明确可验证的内容。来源没有显示的内容保持空白。

### 7.4 导入中心 `/admin/quotation-imports`

格式与版本优先级：

| 优先级 | 格式 | 版本目标 |
| --- | --- | --- |
| P0 | `.xlsx`、`.xls` | 读取工作表、单元格、合并区域、公式显示值和嵌入图片；用户选择目标工作表 |
| P0 | 文本型 `.pdf` | 提取文本和表格，保留页面预览 |
| P0 手工 / P1 自动 | 扫描 `.pdf` | 首版保存、预览并手工录入；阶段 C 自动 OCR/视觉提取 |
| P0 手工 / P1 自动 | `.png`、`.jpg`、`.webp` | 首版保存、预览并手工录入；阶段 C 自动 OCR/视觉提取 |
| P2 | `.docx` | 提取段落、表格和图片 |
| 不承诺 | 旧 `.doc` | 保存为来源附件；需转换能力确认后再支持解析 |

导入检查页必须提供：

- 左侧原始页/工作表预览；
- 右侧结构化字段；
- 每个字段的来源定位或原始文本；
- 明确的缺失、模糊、冲突状态；
- 行级动作：新建、匹配已有产品、仅本次使用、忽略；
- 批量设置币种、单位、供应商和来源日期；
- 最终提交前摘要：新建多少、匹配多少、忽略多少、待解决多少。

历史报价导入还必须提供报价头检查区：客户、联系人、报价日期、源报价号、币种、贸易条款、付款方式、有效期、源文件性质和总金额。任何自动提取字段都必须能回到原始单元格、页码或文本证据。

存在未解决的价格、数量、币种或产品归属冲突时，不允许提交该行；可以跳过该行后提交其他已确认行。

### 7.5 客户管理 `/admin/business-customers`

客户模型与商城 `User` 分开，因为很多询价客户并没有商城账号。

字段：

- 公司名；
- 客户显示名；
- 国家/地区；
- 地址；
- 联系人姓名；
- 邮箱；
- 电话/WhatsApp；
- 默认币种；
- 默认贸易条款；
- 默认付款方式；
- 默认报价有效期；
- 税号/注册号（可选）；
- 内部备注；
- 状态。

一个客户允许多个联系人。历史报价保存客户快照，因此后续修改客户地址不会改变旧报价。

### 7.6 报价列表 `/admin/sales-quotations`

筛选：

- 报价号；
- 客户/公司/联系人；
- 产品关键词；
- 国家；
- 状态；
- 币种；
- 创建人；
- 报价日期范围；
- 有效期范围；
- 总金额范围。

列表分别显示“版本状态”和“业务结果”，不把两套状态混为一个字段。

报价版本状态：

- `DRAFT`：可编辑草稿；
- `READY`：内部检查完成，待生成正式文件；
- `FINALIZING`：正在复制不可变资产并生成正式文件；
- `FINALIZED`：正式文件已生成，版本已锁定，但尚未确认发给客户；
- `ISSUED`：管理员确认已经发给客户；
- `SUPERSEDED`：已有更新版本正式发出；
- `VOID`：版本作废但保留；
- `ARCHIVED_IMPORT`：从历史文件导入并锁定，原文件是否曾发出由独立证据状态表达。

主报价业务结果：

- `OPEN`：尚无最终结果；
- `ACCEPTED`：客户接受指定的已发版本；
- `REJECTED`：客户拒绝指定的已发版本；
- `CANCELLED`：整个报价业务作废。

“已过期”是显示状态：当业务结果仍为 `OPEN` 且最新已发版本的有效期早于当前日期时派生为 `EXPIRED`，不单独覆盖保存。`ACCEPTED`、`REJECTED` 和确认已发均由管理员手工操作，并必须指定目标版本、时间和备注。

### 7.7 报价编辑器 `/admin/sales-quotations/[id]/edit`

基础信息：

- 报价号；
- 版本号；
- 报价日期；
- 有效期；
- 客户和联系人；
- 报价语言：中文、英文或双语；
- 币种；
- 贸易条款；
- 付款方式；
- 交期；
- 报价模板；
- 内部备注；
- 客户可见备注。

报价行功能：

- 搜索报价产品；
- 搜索正式商城商品；
- 新增空白临时行；
- 从另一个报价复制行；
- 粘贴多行表格；
- 拖动排序；
- 替换本次报价图片；
- 编辑本次报价的中英文名称和规格；
- 设置数量、单位、单价、行折扣和小计；报价级税率在基础信息/费用区设置；
- 设置内部成本、采购币种和利润率；
- 选择是否在客户版显示型号、图片、规格、MOQ 和包装；
- 将当前行保存为新的报价产品。

金额组成：

- 产品小计；
- 折扣；
- 运费；
- 其他费用；
- 税费；
- 舍入调整；
- 总计。

金额由服务端使用 Decimal 重新计算，前端计算仅用于即时预览。客户端提交的总计不能作为最终可信值。

### 7.8 报价预览和导出

首个可用版本输出：

- 客户版 PDF；
- 客户版 Excel；
- 内部核价版 Excel，可包含成本和利润，但必须有明显内部标识；
- 版本快照 JSON，供系统内部复现，不提供给客户。

客户版必须支持：

- 公司抬头、Logo、签名和公章配置；
- 客户信息；
- 报价号、日期、有效期；
- 图片全部展示或按模板展示；
- 每条规格分行显示；
- 数量、单位、单价、小计和总计；
- 币种和条款；
- 中文、英文或双语模板；
- 页码和跨页表头；
- 不显示采购价、成本、利润、供应商链接和内部备注。

正式定稿流程：

1. 用户从 `READY` 点击“生成正式版本”；
2. 服务端验证乐观锁并将版本转为 `FINALIZING`，阻止继续编辑；
3. 重新计算金额，将本次报价使用的图片复制为不可变报价资产；
4. 首个可用版本同时生成客户版 PDF 和客户版 Excel；内部核价 Excel 可选；
5. 做结构验证，包括页数、报价号、客户、总金额、图片和禁显字段；
6. 文件写入私有存储并保存文件哈希；
7. 在事务中将版本转为 `FINALIZED`；
8. 如任何步骤失败，版本返回 `READY`，记录失败原因且不得产生 `FINALIZED/ISSUED` 状态；
9. 用户下载并自行发送后，点击“标记已发出”，版本从 `FINALIZED` 转为 `ISSUED`。

浏览器本地临时预览可以保留，但不能作为正式版本的唯一文件证据。`ISSUED` 必须存在已通过校验的客户版 PDF。

### 7.9 历史价格检索

在报价产品详情和全局搜索中展示：

- 报价日期；
- 客户；
- 国家；
- 数量；
- 单位；
- 币种；
- 单价；
- 总价；
- 报价版本；
- 报价状态；
- 当时的成本和利润率（有权限时）；
- 来源文件。

不同币种默认不自动换算后排序比较。若将来加入汇率，应保存报价时使用的汇率和来源，不能用今天的汇率改写旧数据。

## 8. 数据模型设计

### 8.1 关系概览

```text
BusinessCustomer 1 --- n BusinessCustomerContact
BusinessCustomer 1 --- n SalesQuotation

SalesQuotation 1 --- n SalesQuotationRevision
SalesQuotationRevision 1 --- n SalesQuotationItem
SalesQuotationRevision 1 --- n SalesQuotationDocument

QuotationProduct 1 --- n QuotationProductImage
QuotationProduct 1 --- n QuotationProductSource
QuotationProduct 1 --- n QuotationProductCostRecord
QuotationProduct 1 --- n SalesQuotationItem (optional reference)
Product 1 --- n SalesQuotationItem (optional reference)
SalesQuotationItem 1 --- n SalesQuotationItemAsset

QuotationImportBatch 1 --- n QuotationImportRow
QuotationImportBatch 1 --- n QuotationSourceFile
QuotationImportRow 0..1 --- 1 QuotationProduct
```

### 8.2 `QuotationProduct`

建议字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | cuid | 主键 |
| `internalCode` | string unique | 系统生成内部编号 |
| `nameZh` | string nullable | 中文名 |
| `nameEn` | string nullable | 英文名 |
| `model` | string nullable | 来源中确认的型号 |
| `descriptionZh` | text nullable | 中文描述 |
| `descriptionEn` | text nullable | 英文描述 |
| `specifications` | jsonb nullable | 结构化规格，保留显示顺序 |
| `unit` | string nullable | 默认单位 |
| `moq` | decimal nullable | 最小起订量，不猜测 |
| `packaging` | jsonb nullable | 包装信息 |
| `leadTimeText` | string nullable | 交期文本 |
| `supplierName` | string nullable | 供应商显示名 |
| `supplierUrl` | string nullable | 内部链接，客户版禁显 |
| `status` | enum | `DRAFT/VERIFIED/INACTIVE/PROMOTED` |
| `promotedProductId` | string nullable | 可选关联正式 `Product` |
| `createdById` | string | 创建人 |
| `updatedById` | string | 修改人 |
| `version` | int | 乐观锁版本 |
| `createdAt/updatedAt` | datetime | 审计时间 |

约束：`nameZh` 与 `nameEn` 至少一个非空；SKU、型号、MOQ、标准、证书编号均不设为必填。

首版用 `status=INACTIVE` 表达归档，不再同时使用 `deletedAt`，避免“停用、软删除、归档”含义重叠。只有从未被报价、导入或来源记录引用的空草稿，才允许二次确认后物理删除。

### 8.3 `QuotationProductImage`

- `quotationProductId`；
- 私有对象存储 key；
- 原始文件名；
- MIME type；
- 宽高；
- 文件大小；
- SHA-256；
- 图片用途：主图、规格图、包装图、证书图、其他；
- 排序；
- 来源文件/页码；
- 是否允许出现在客户报价中。

数据库不保存永久公开 URL，页面通过管理员鉴权下载或短时签名 URL 查看。

### 8.4 `QuotationProductSource` 与采购成本记录

`QuotationProductSource` 明确报价产品与证据来源的多对多关系：

- `quotationProductId`；
- `sourceFileId`；
- `importRowId`，可空；
- 来源工作表、单元格范围、页码或图片区域；
- 原始文本和字段证据 JSON；
- 关联动作：新建、匹配、人工补充；
- 创建人和时间。

来源文件或导入行被引用后使用 `RESTRICT` 删除行为；需要清理时先解除未被历史报价依赖的关系并写审计日志。

`QuotationProductCostRecord` 保存独立于客户报价的采购历史：

- 供应商、采购日期、数量区间和单位；
- 采购币种、采购单价、MOQ、包装和交期；
- 来源文件/导入行；
- 是否经过人工确认；
- 创建人和时间。

报价产品列表上的“最近采购价”从已确认成本记录派生，不在 `QuotationProduct` 保存容易失真的 `latestCost`。

### 8.5 `BusinessCustomer` 与联系人

`BusinessCustomer` 保存公司层信息；`BusinessCustomerContact` 保存一个或多个联系人。报价版本另外保存客户名称、地址、联系人、邮箱和电话快照。

客户去重只提示，不自动合并。建议匹配键为公司规范名、邮箱域名、税号和电话的组合，但合并必须人工确认。

### 8.6 `SalesQuotation`

主记录保存不会随版本变化的身份：

- `id`；
- `quotationNumber`；
- `customerId`，创建后不可更换；
- `ownerId`；
- `currentWorkingRevisionId`，可空，可指向 `DRAFT/READY/FINALIZING/FINALIZED`；
- `latestIssuedRevisionId`，可空；
- `outcomeStatus`：`OPEN/ACCEPTED/REJECTED/CANCELLED`；
- `outcomeRevisionId` 和结果备注，可空；
- `sourceInquiryId`，可选关联现有客户询价 `Quote`；
- `createdAt/updatedAt`；
- `archivedAt`，仅控制后台默认列表显示，不删除任何版本或文件。

### 8.7 `SalesQuotationRevision`

保存某次完整报价版本：

- `salesQuotationId`；
- `revisionNumber`；
- `state`：`DRAFT/READY/FINALIZING/FINALIZED/ISSUED/SUPERSEDED/VOID/ARCHIVED_IMPORT`；
- 报价日期和有效期；
- 客户信息快照；
- 语言、币种、条款；
- 费用、折扣、税费和总金额；
- 客户备注和内部备注；
- 模板 ID 和模板版本；
- `issuedAt/issuedById`；
- `createdFromRevisionId`；
- `origin`：`NATIVE/HISTORICAL_IMPORT`；
- `historicalDocumentStatus`：`DRAFT/ISSUED/UNKNOWN`，仅历史导入使用；
- `sourceQuotationNumber`，可空、非唯一并建立索引；
- `version` 乐观锁；
- 创建和更新时间。

数据库唯一约束：`salesQuotationId + revisionNumber`。

历史原编号不承担系统唯一性。系统 `quotationNumber` 始终唯一；即使两个客户都存在旧编号 `YLF20260826`，也可以分别保存为 `sourceQuotationNumber`。

### 8.8 `SalesQuotationItem`

每一行保存完整快照，同时保留可选来源引用：

- `quotationProductId`，可空；
- `productId`，可空；
- `sourceImportRowId`，可空；
- 行号和排序；
- 中英文名称快照；
- 型号、SKU、规格和图片快照；
- 数量、单位；
- 单价；报价币种由 revision 唯一决定，报价行不允许另设不同销售币种；
- 行折扣、小计；税率只保存在 revision；
- 成本币种、成本单价、汇率快照；
- 采购总成本和利润率；
- MOQ、包装、交期快照；
- 客户可见性配置；
- 内部备注。

三种合法来源：

1. `quotationProductId` 有值；
2. `productId` 有值；
3. 两者都为空，为一次性临时报价行。

无论来源是哪一种，名称、价格、数量和金额快照均必须保存，导出时不能依赖来源产品的最新值。

数据库和 Zod 同时执行来源互斥规则：`quotationProductId` 与 `productId` 最多一个有值。`sourceImportRowId` 只是证据引用，可以与上述任一来源或一次性临时行组合，不参与互斥。

`SalesQuotationItemAsset` 保存报价行图片快照：

- 草稿编辑时可以引用报价产品图、正式商品图或上传临时图片；
- `FINALIZING` 时把客户版使用的图片复制到版本专属、不可变的私有 object key；
- 保存 MIME、尺寸、大小、SHA-256、排序和来源 asset ID；
- 版本进入 `FINALIZED` 后禁止覆盖或清理这些 object key；
- 旧版本的图片不受资料库图片替换、归档或删除影响。

### 8.9 导入与来源模型

`QuotationImportBatch`：

- 上传人；
- 状态：`UPLOADED/PARSING/REVIEW_REQUIRED/CONFIRMED/PARTIAL/FAILED/CANCELLED`；
- 解析器版本；
- 来源类型；
- 导入模式：`PRODUCT_LIBRARY/HISTORICAL_QUOTATION/ADD_TO_EXISTING_QUOTATION`；
- `targetQuotationRevisionId`，仅加入现有报价模式使用；
- 历史报价头提取值和用户确认值；
- 默认币种/单位/供应商；
- 错误摘要；
- 创建、确认和取消时间。

`QuotationSourceFile`：

- 私有对象 key；
- 原文件名、MIME、大小、哈希；
- 页数/工作表信息；
- 上传人；
- 病毒/安全扫描状态；
- 是否为主来源；
- 保留策略。

`QuotationImportRow`：

- 原始行号、页码、工作表；
- 原始文本/单元格范围；
- 提取字段 JSON；
- 字段级置信/证据 JSON；
- 用户修正后的字段 JSON；
- 处理动作；
- 匹配的报价产品；
- 状态和错误信息。

部分提交规则：

- `PRODUCT_LIBRARY` 和 `ADD_TO_EXISTING_QUOTATION` 可以只提交已解决的行；批次转为 `PARTIAL`；
- 未处理和失败行继续保留，可在后续确认中提交；
- 当所有行均为已提交或已忽略时，批次转为 `CONFIRMED`；
- `cancel` 只取消尚未提交的剩余行，不撤销已提交结果；
- 已提交结果如需撤销，使用独立审计动作：未被引用的新建草稿可删除，已被引用的数据只能解除错误关系或标记 `INACTIVE`，不得连带删除已发报价。

`HISTORICAL_QUOTATION` 采用全有或全无确认：允许多次保存 staging 修正，但在所有保留行已解决、报价头已确认之前不创建任何 `SalesQuotation`；最终一次事务创建唯一主报价、完整 `ARCHIVED_IMPORT` 版本、全部报价行和来源关系。这样不会把一份旧报价拆成多个系统报价。

### 8.10 报价文档和审计

`SalesQuotationDocument` 保存：

- 报价版本；
- 文档类型：客户 PDF、客户 Excel、内部 Excel、源附件；
- 模板版本；
- 私有对象 key；
- 文件名、MIME、大小和 SHA-256；
- 生成状态；
- 结构校验结果；
- 生成者和生成时间。

`QuotationAuditLog` 保存关键动作：创建、编辑、确认导入、匹配/合并、锁定版本、状态变更、导出、转正式产品、停用和恢复。审计记录只追加，不允许普通编辑。

## 9. 编号、金额与版本规则

### 9.1 报价编号

默认建议：`YLF-YYYYMMDD-NNN`，例如 `YLF-20260829-001`。

- 同一天序号在数据库事务中生成，避免并发重复；
- 允许管理员在草稿阶段输入外部旧编号；
- 正式发出后主编号不可修改；
- 修订号单独显示，不把旧版本覆盖掉。

此编号格式属于待评审项。如果继续沿用 `YLF20260826` 等历史格式，应在开发前确定唯一规则。

### 9.2 精度规则

- 数量：`Decimal(18, 4)`，支持重量、箱数等非整数；
- 单价和成本：`Decimal(18, 6)`；
- 中间金额和最终金额：`Decimal(19, 6)` 存储，导出按版本保存的币种小数位显示；
- 税率/折扣率/利润率：`Decimal(9, 4)`；
- 任何金额计算使用 Decimal，禁止 JavaScript 浮点作为最终值；
- 每个 revision 只能有一个客户报价币种，所有报价行销售单价均使用该币种；
- `currencyMinorUnit` 与 `roundingMode` 保存到 revision 快照，默认根据 ISO 4217 配置，不能假设所有币种都是两位小数；
- 客户版金额按 `currencyMinorUnit` 舍入显示，内部计算保留六位小数。

首个可用版本金额计算次序：

1. `lineGross = quantity × unitPrice`；
2. `lineDiscount = fixedDiscount` 或 `lineGross × discountRate`，二者不能同时使用；
3. `lineNet = round(lineGross - lineDiscount, currencyMinorUnit)`；
4. `goodsSubtotal = sum(lineNet)`；
5. `headerDiscount` 为固定额或基于 `goodsSubtotal` 的百分比，二者不能同时使用；
6. `netGoods = goodsSubtotal - headerDiscount`；
7. `preTaxTotal = netGoods + shippingFee + otherFee`；
8. 首版只支持一个报价级、价外税率：`tax = round(preTaxTotal × taxRate, currencyMinorUnit)`；
9. `grandTotal = preTaxTotal + tax + roundingAdjustment`。

首版不支持同一报价多税率或含税倒算。折扣和费用不得让总额为负。

内部成本换算：

- 若成本币种等于报价币种，`costInQuoteCurrency = quantity × unitCost`；
- 若不同，必须人工填写并保存“1 单位成本币种等于多少报价币种”的 `costFxRate` 及汇率日期；
- `costInQuoteCurrency = quantity × unitCost × costFxRate`；
- `profit = lineNet - costInQuoteCurrency`；
- `margin = profit / lineNet`，当 `lineNet <= 0` 或缺少成本/汇率时不计算，不显示伪造的 0%。

### 9.3 版本规则

- 未发出的草稿版本可以更新；
- `READY -> FINALIZING -> FINALIZED` 执行金额重算、不可变资产复制、正式文件生成和审计；
- `FINALIZED` 后内容表、报价行和资产禁止更新/删除；
- `FINALIZED -> ISSUED` 由管理员确认实际发送时间；
- `READY` 可由管理员撤回到 `DRAFT`；
- 未发送的 `FINALIZED` 发现错误时，原版本转 `VOID` 并复制为新 `DRAFT`，正式文件继续保留；
- 当 `outcomeStatus=OPEN` 时，可从最新 `ISSUED` 版本创建新 `DRAFT`，旧版本仍为当前有效已发版本；
- 新版本发出后，旧 `ISSUED` 才转为 `SUPERSEDED`，`latestIssuedRevisionId` 指向新版本；
- `ACCEPTED/REJECTED` 必须指定一个 `ISSUED` 版本；
- 更换客户必须复制为新主报价，不能在同一报价号下修订；
- 作废只改变状态，不删除版本、资产和文件。

关键状态转换表：

| 动作 | 前置状态 | revision 结果 | 主报价指针/结果 |
| --- | --- | --- | --- |
| 新建报价 | 无 | Rev.1=`DRAFT` | `currentWorkingRevisionId=Rev.1`，`latestIssuedRevisionId=null`，`outcome=OPEN` |
| 准备定稿 | `DRAFT` 且校验通过 | `READY` | 指针不变 |
| 撤回修改 | `READY` | `DRAFT` | 指针不变并写审计 |
| 正式定稿 | `READY` | `FINALIZING -> FINALIZED`；失败回 `READY` | 指针不变 |
| 定稿后纠错 | `FINALIZED` 且未发送 | 原 Rev=`VOID`，复制新 Rev=`DRAFT` | 工作指针指向新 Rev，保留旧正式资产 |
| 确认已发送 | `FINALIZED` 且正式 PDF/Excel 均存在 | `ISSUED` | `latestIssuedRevisionId=本版本`，`currentWorkingRevisionId=null`，`outcome=OPEN` |
| 创建修订 | 存在最新 `ISSUED` 且 `outcome=OPEN` | 新 Rev=`DRAFT`，旧 Rev 保持 `ISSUED` | 工作指针指向新 Rev，最新已发仍指向旧 Rev |
| 新修订已发送 | 新 Rev=`FINALIZED` 且 `outcome=OPEN` | 新 Rev=`ISSUED`，旧 Rev=`SUPERSEDED` | 最新已发指向新 Rev，工作指针清空，结果保持 `OPEN` |
| 接受/拒绝 | 目标版本等于 `latestIssuedRevisionId` | revision 不变 | 结果改为 `ACCEPTED/REJECTED` 并记录目标版本 |
| 作废未发版本 | `DRAFT/READY/FINALIZED` | `VOID` | 如为当前草稿则清空；正式资产保留 |
| 取消整个报价 | 非 `CANCELLED` | 各版本不删除 | 主结果=`CANCELLED`，记录原因 |
| 导入历史报价 | 用户确认来源状态 | `ARCHIVED_IMPORT` | 无当前草稿；历史证据状态单独保存 |

已经 `ISSUED` 的版本不能直接改为 `VOID`；如确认整项业务无效，使用主报价 `CANCELLED` 并保留发出记录。`ACCEPTED/REJECTED` 后不允许创建原报价修订；仍需新报价时复制为新报价号。

## 10. 文件存储与隐私设计

### 10.1 必须使用私有存储

以下文件不得通过可猜测的公共 URL 暴露：

- 客户报价草稿；
- 带采购价、成本或供应商信息的 Excel；
- 客户地址、邮箱、电话和税号；
- 签名、公章、合同条款；
- 内部核价文件。

推荐新增独立私有 R2 Bucket，或至少采用不能通过当前公共域名访问的私有存储配置。数据库只保存 object key；下载通过管理员鉴权接口或短期签名 URL。

默认安全配置：

- 管理员预览/下载签名 URL 有效期 5 分钟；
- 鉴权下载响应使用 `Cache-Control: private, no-store`；
- 签名、公章和正式模板资产仅 `ADMIN` 可读取，并对每次更换和使用写审计日志；
- 已确认来源文件、已定稿报价资产和正式文档默认长期保留，除非以后批准明确的数据保留政策；
- 未确认且无引用的导入批次默认 30 天后进入清理队列，执行前记录待删除对象列表。

### 10.2 上传限制

- 只允许管理员上传；
- 同时校验文件扩展名、声明 MIME 和文件 magic bytes；
- 文件名不直接作为 object key；
- 限制单文件大小和批次总大小；
- 解压 Office 文件时限制条目数和解压后总体积，防止 zip bomb；
- PDF 限制页数；
- 图片限制像素总量；
- 记录 SHA-256；
- 解析在受限临时目录中进行；
- 错误日志不能写入客户完整内容、签名 URL 或密钥。

建议初始限制：单文件 30 MB、单批次 100 MB、PDF 100 页。此数值在开发前根据真实样本确认。

文件安全状态为 `QUARANTINED/SCANNING/CLEAN/REJECTED/SCAN_UNAVAILABLE`。上传顺序为：先进入不可预览、不可解析的隔离前缀，再执行安全扫描；只有 `CLEAN` 文件可被解析、预览或下载。`REJECTED` 与 `SCAN_UNAVAILABLE` 默认 fail closed，只允许管理员删除或在配置恢复后重试，不允许绕过继续导入。开发前必须确认实际扫描实现或受控替代方案；未确认前不开放生产文档上传。

### 10.3 删除策略

- 未确认导入批次可取消并进入延迟清理；
- 已用于报价的来源文件不可立即物理删除；
- 报价产品使用软删除；
- 已发出报价、版本和文档不可物理删除，只能作废；
- 定时任务清理无引用的临时文件；
- 物理删除必须记录操作人、目标和结果。

## 11. 导入解析策略

### 11.1 分层解析

1. 确定性解析：Excel 单元格、PDF 文本层、文档表格、嵌入图片；
2. OCR/视觉解析：扫描 PDF 和图片；
3. 结构化映射：识别品名、规格、数量、单位、价格、币种等；
4. 人工确认：解决目标工作表、表头、合并单元格、图片归属和字段冲突。

系统必须优先保留原始证据，再生成结构化建议。AI 结果不能覆盖原始值。

### 11.2 Excel 特殊处理

- 用户明确选择目标工作表，系统不能自行替换成相邻工作表；
- 公式值和公式表达式分别保留；
- `#REF!`、`#NAME?`、`#VALUE!` 等错误必须标记；
- `DISPIMG(...)`、嵌入 drawing 和普通图片需分别识别；
- 合并单元格要保留显示关系；
- 导入时保留工作表名、单元格范围和原始行号；
- 不修改源文件，生成的数据是独立记录。

### 11.3 PDF/图片特殊处理

- 文本 PDF 先提取文本和表格；
- 扫描 PDF 按页渲染后识别；
- 图片与产品行的归属不明确时必须让用户选择；
- 不能读清的标准号、型号、价格和数量保持待确认；
- 记录页码、裁剪区域或原始文本，支持回看证据。

### 11.4 产品匹配与去重

首个可用版本使用确定性候选匹配：

- 内部编号精确匹配；
- 型号规范化匹配；
- 中文/英文名和供应商组合匹配；
- 文件哈希和图片哈希提示；
- 规格关键词相似度作为候选排序。

系统只给出候选和差异，不自动合并。确认合并时保留来源记录和审计日志。

现有正式商品向量检索不直接用于报价产品库；若后续需要“找相似报价产品”，为 `QuotationProduct` 建立独立索引和独立重建任务。

## 12. 页面与交互原则

- 桌面端优先，报价表格允许横向滚动和固定关键列；
- 自动保存草稿，但正式发出必须显式确认；
- 删除、合并、锁定、正式发出、转商城产品均二次确认；
- 表单离开前提示未保存修改；
- 并发编辑冲突时不得静默覆盖，显示“数据已被其他会话更新”；
- 内部字段与客户可见字段使用明显的视觉分区；
- 导入检查页始终能看到来源证据；
- 批量操作显示将影响的准确条目数；
- 搜索结果显示价格对应的币种、数量和日期，避免脱离上下文比较。

## 13. API 与服务端契约草案

以下为后续开发前必须固化的接口方向；实际实现可采用 Server Actions 或 Route Handlers，但所有输入输出都要由 Zod schema 定义。

### 13.1 报价产品

- `searchQuotationProducts(input)`；
- `getQuotationProduct(id)`；
- `createQuotationProduct(input)`；
- `updateQuotationProduct({ id, expectedVersion, patch })`；
- `archiveQuotationProduct(id)`；
- `restoreQuotationProduct(id)`；
- `promoteQuotationProduct({ id, mapping, expectedVersion })`，阶段 C 接口，首版不实现。

### 13.2 导入

- `createQuotationImportSession({ mode, targetQuotationRevisionId?, historicalHeader? })`；
- `uploadQuotationSourceFile(sessionId, file)`；
- `startQuotationImportParse(batchId, parsingOptions)`；
- `getQuotationImportBatch(batchId)`；
- `updateQuotationImportRow({ rowId, expectedVersion, resolution })`；
- `confirmQuotationImport({ batchId, expectedVersion, mode, targetQuotationRevisionId?, historicalHeader?, rowActions })`；
- `cancelQuotationImport(batchId)`。

确认导入必须在事务中：

1. 验证批次仍处于可确认状态；
2. 验证所有提交行的版本号；
3. 新建/关联报价产品；
4. 保存来源关系；
5. 更新批次结果；
6. 写审计日志。

模式约束：

- `PRODUCT_LIBRARY` 不接受目标报价 ID；
- `ADD_TO_EXISTING_QUOTATION` 必须指定仍为 `DRAFT` 的 revision；
- `HISTORICAL_QUOTATION` 必须提交用户确认后的客户、报价日期、币种和文档状态；所有保留行解决后才一次性创建 `ARCHIVED_IMPORT` 版本，不支持业务数据部分提交；
- 其他模式部分提交返回已提交行、剩余行和批次新状态，重试不得重复创建成功行。

### 13.3 报价

- `createSalesQuotation(input)`；
- `updateSalesQuotationDraft({ revisionId, expectedVersion, patch })`；
- `recalculateSalesQuotation(revisionId)`；
- `finalizeSalesQuotation({ revisionId, expectedVersion, templateId })`；
- `markSalesQuotationIssued({ revisionId, expectedVersion, issuedAt, note? })`；
- `createSalesQuotationRevision({ quotationId, fromRevisionId })`；
- `withdrawSalesQuotationRevision({ revisionId, expectedVersion })`；
- `voidAndCopyFinalizedRevision({ revisionId, expectedVersion, reason })`；
- `setSalesQuotationOutcome({ quotationId, targetIssuedRevisionId, outcome, note? })`；
- `voidSalesQuotationRevision({ revisionId, expectedVersion, reason })`；
- `generateSalesQuotationPreview({ revisionId, templateId, documentType })`，仅预览，不产生正式文件证据；
- `downloadSalesQuotationDocument(documentId)`。

`finalizeSalesQuotation` 的服务端成功输出至少返回：

- 报价 ID；
- 版本 ID 和版本号；
- 锁定后的 `FINALIZED` 状态；
- 服务端重算总金额；
- 审计记录 ID；
- 已通过校验的客户 PDF 文档 ID、文件哈希和生成时间。

该接口不允许返回“已定稿但文档仍在排队”。若未来必须异步生成，客户端只能看到 `FINALIZING`；只有生成与校验成功后才能进入 `FINALIZED`。

### 13.4 环境配置草案

后续实现前需要确认并记录：

- 私有 R2 endpoint、bucket、access key 和 secret key；
- 私有下载签名有效期；
- 单文件/批次/PDF 页数限制；
- OCR/视觉解析提供方和模型；
- 导入任务超时、重试次数和并发数；
- 默认报价编号前缀；
- 默认币种和舍入规则；
- PDF 中英文字体资源；
- 文件保留和备份策略；
- 文件恶意内容扫描实现及失败策略；

配置只记录变量名和行为，不把密钥写入代码、文档、日志或数据库。

## 14. 校验与错误处理矩阵

| 场景 | 系统行为 | 数据写入 |
| --- | --- | --- |
| 未登录或非管理员访问 | 返回 401/403 或跳转登录，记录安全事件 | 无 |
| 文件扩展名与 magic bytes 不一致 | 拒绝上传并说明不支持 | 无业务数据；临时文件清理 |
| 文件扫描未完成、失败或服务不可用 | 禁止解析、预览和下载，可删除或重试 | 仅保留隔离文件和安全状态 |
| 文件超限或疑似压缩炸弹 | 立即终止 | 无业务数据 |
| 相同 SHA-256 文件已上传 | 显示已有批次和日期，用户选择继续或取消 | 默认不新建导入结果 |
| Excel 有多个工作表 | 要求用户选择目标工作表 | 批次可保存，产品库无写入 |
| Excel 公式错误 | 显示公式与错误值并标记待确认 | 不猜测计算结果 |
| PDF 无文本层 | 首版保留预览并要求手工录入；阶段 C 才进入 OCR/视觉解析 | 不自动生成产品行 |
| 阶段 C 的 OCR/AI 超时 | 批次标记可重试，保留源文件 | 不写产品库 |
| 价格/币种/数量冲突 | 行标记未解决，阻止该行提交 | 其他已确认行可提交 |
| 产品候选匹配不确定 | 显示候选和差异 | 不自动合并 |
| 客户名称重复 | 提示候选 | 用户确认前不合并 |
| 报价总额与服务端重算不一致 | 使用服务端结果并提示刷新 | 不锁定错误版本 |
| 报价行销售币种与 revision 不一致 | 拒绝保存并指明行号 | 无 |
| 两个会话同时编辑 | 第二次保存返回版本冲突 | 不覆盖第一份修改 |
| 尝试编辑已锁定版本 | 拒绝并建议创建修订版 | 无 |
| 正式文档生成或校验失败 | 版本返回 `READY`，失败记录可重试 | 不产生 `FINALIZED/ISSUED` |
| 图片下载/渲染失败 | 标记具体报价行和图片 | 不正式发出，除非用户确认无图版 |
| 私有存储上传失败 | 回滚文档记录或标记失败 | 不返回无效下载地址 |
| 转正式商品缺少必填字段 | 显示缺失项 | 不创建 `Product` |
| 审计日志写入失败 | 关键事务整体回滚 | 不完成关键状态变更 |

## 15. Good / Base / Bad 验收用例

### 15.1 Good：结构清晰的 Excel 报价草稿

给定一个包含明确工作表、10 个产品行、图片、数量、币种和单价的 Excel：

- 用户选择正确工作表；
- 系统提取 10 行并显示单元格来源；
- 用户修正其中 1 行产品名；
- 用户先创建一张目标草稿报价，并选择 `ADD_TO_EXISTING_QUOTATION` 导入模式；
- 6 行新建报价产品、3 行匹配已有报价产品、1 行仅本次使用；
- 确认后 10 行加入该目标草稿报价；
- 正式发出后保存不可变版本和客户版 PDF/Excel；
- 修改资料库产品不会改变已发出文件和历史价格。

### 15.2 Good：历史报价导入

给定一份含客户、日期、旧报价号、USD 币种和 8 个产品行的旧报价：

- 用户选择 `HISTORICAL_QUOTATION`；
- 系统分别提取报价头和产品行，原报价号保存为非唯一 `sourceQuotationNumber`；
- 用户将文件性质确认为 `DRAFT/ISSUED/UNKNOWN` 之一；
- 确认后生成唯一内部报价号和锁定的 `ARCHIVED_IMPORT` 版本；
- 8 行产品出现在对应产品的客户、日期、数量和价格历史中；
- 重新提交同一批次不会重复创建报价或产品行。

### 15.3 Base（阶段 C）：扫描 PDF，部分内容不清楚

给定一个 5 页扫描 PDF：

- 系统保留每页预览；
- 能识别的品名和图片形成待确认行；
- 看不清的型号、证书号和价格保持待确认；
- 用户可以跳过未解决行，先提交其他行；
- 系统不根据相邻产品或历史数据填补缺失字段；
- 原始 PDF 可从导入批次回看。

### 15.4 Bad：错误工作表、重复文件和并发修改

给定一个含多个工作表、公式错误和 `DISPIMG(...)` 的 Excel：

- 系统不自行认定相邻工作表为目标；
- 公式错误明确显示，不当作零值；
- 重复上传提示已有文件；
- 两个浏览器同时编辑同一导入批次时，后保存者收到版本冲突；
- 未经“确认导入”不会产生报价产品；
- 即使解析成功，也不会自动上传到商城或改变正式 `Product`。

### 15.5 报价版本验收

- 已发出 Rev.1 后修改价格，系统必须创建 Rev.2；
- Rev.1 与 Rev.2 可分别下载，文件哈希不同；
- Rev.1 的客户、产品、金额、条款和模板版本保持不变；
- Rev.2 草稿存在时 Rev.1 仍为最新已发版本；Rev.2 发出后 Rev.1 才变为 `SUPERSEDED`；
- 更换客户时系统要求复制为新报价号；
- 作废版本不删除其文档和不可变图片资产；
- 客户版不包含成本、利润、供应商链接和内部备注。

### 15.6 金额与私有资产验收

- 三位小数币种按 revision 的 `currencyMinorUnit=3` 正确存储、计算和导出；
- 同一 revision 出现不同销售币种时保存失败并指出具体行；
- 成本币种不同但缺少汇率时不显示利润率；
- 正式定稿失败时版本不能进入 `FINALIZED/ISSUED`；
- 签名 URL 在 5 分钟后失效，匿名访问返回拒绝，响应不可公共缓存；
- 报价产品原图替换或归档后，旧版本仍能用独立 object key 复现原图。

## 16. 测试与质量门槛

### 16.1 自动测试

- Zod 输入/输出 schema 测试；
- Decimal 金额计算和舍入测试；
- 报价编号并发唯一性测试；
- 报价锁定和修订状态机测试；
- 导入批次状态机测试；
- 重复文件哈希测试；
- 乐观锁冲突测试；
- 私有文件鉴权下载测试；
- 客户版禁显字段测试；
- 数据库事务回滚测试；
- 阶段 C：报价产品转正式商品的字段映射测试；
- 历史报价导入幂等测试；
- 报价行来源外键互斥测试；
- 三位小数币种与金额计算顺序测试；
- 正式定稿失败回滚测试；
- 不可变图片资产保留测试；
- 签名 URL 到期与 `private, no-store` 测试。

### 16.2 文件样本回归集

开发前从真实文件中挑选脱敏样本：

- 结构清晰的 `.xlsx`；
- 含合并单元格的 `.xlsx`；
- 含嵌入图片或 `DISPIMG(...)` 的工作簿；
- 文本 PDF；
- 扫描 PDF；
- 单张产品图片；
- 有公式错误的 Excel；
- 多工作表且目标工作表不在第一页的 Excel。

任何真实客户文件进入测试集前都需要脱敏，并保存为单独测试副本，不覆盖原始文件。

### 16.3 导出视觉检查

每种模板至少验证：

- 中文、英文和双语文本不乱码；
- 图片没有被裁切或错误归属；
- 规格逐条分行；
- 长产品名、长规格和跨页表格正常；
- 报价号、客户、币种和总金额正确；
- 页码和跨页表头正确；
- 客户版无内部字段；
- PDF 提取文本与页面渲染均通过检查；
- Excel 打开后无新增 `#REF!/#VALUE!/#NAME?` 错误。

### 16.4 开发完成门槛

- lint、typecheck 和相关自动测试通过；
- Prisma migration 可在空库和现有数据库副本上执行；
- 回滚/恢复方案已验证；
- 关键页面完成桌面浏览器流程测试；
- 私有文件无法匿名访问；
- 至少一份脱敏 Excel 和一份文本型 PDF 完成端到端导入；
- 至少一份旧历史报价完成报价头、产品行和价格历史导入；
- 至少一张含临时产品的报价完成创建、锁定、修订和导出；
- 未经明确确认不触发生产部署或真实数据导入。

### 16.5 可测性能基线

在测试环境准备至少 10,000 个报价产品、20,000 张报价行和 1,000 个客户：

- 普通关键词搜索和分页的服务端 P95 响应目标小于 2 秒；
- 报价编辑器加载 100 行报价的服务端 P95 响应目标小于 3 秒；
- 30 MB、100 页限制内的解析属于后台任务，不承诺同步完成，但必须在 5 秒内返回批次 ID 和可查看状态；
- 长任务至少每 30 秒更新一次进度或阶段；
- 超时和重试不得重复创建已成功提交的产品、报价或文档。

性能目标以部署环境实测为准；如测试环境无法达到，评审后调整目标并记录原因，不能静默取消。

## 17. 分期实施建议

### 17.1 阶段 A：领域基础与手工闭环

- 新数据表和迁移；
- 报价产品手工 CRUD；
- 实际客户资料库；
- 报价创建、编辑、金额计算；
- 报价锁定和修订；
- 客户 PDF/Excel 导出；
- 私有文件存储和审计。

阶段 A 是内部开发里程碑：完成后可以手工制作报价，但尚未满足“导入本地草稿”的核心需求，不单独称为首个可用版本。

### 17.2 阶段 B：本地草稿导入

- 导入批次和来源文件；
- Excel 确定性解析和图片提取；
- 文本型 PDF 文本/表格解析；
- 人工检查和行级提交；
- 产品资料、历史报价、加入现有报价三种导入模式；
- 重复文件、产品候选和来源追踪；
- 导入回归样本集。

**阶段 A + 阶段 B 合并构成首个可用版本。**

### 17.3 阶段 C：扫描件与效率增强

- 扫描 PDF 和图片的 OCR/视觉解析；
- 相似报价产品候选；
- 批量粘贴/批量编辑；
- 报价模板管理；
- 历史价格分析；
- 报价产品转商城草稿。

### 17.4 阶段 D：业务扩展

- 销售/审核/财务角色；
- 邮件发送与送达记录；
- 客户确认链接；
- 报价转订单、PI、CI；
- 汇率来源与多币种比较；
- 独立部署或拆分服务评估。

## 18. 建议修改范围（批准后）

本节只是未来开发影响面，不代表已经批准修改。

预计新增：

- `prisma/migrations/<timestamp>_quotation_workbench/`；
- `src/app/admin/quotation-workbench/`；
- `src/app/admin/quotation-products/`；
- `src/app/admin/quotation-imports/`；
- `src/app/admin/business-customers/`；
- `src/app/admin/sales-quotations/`；
- `src/app/api/admin/quotation-files/`；
- `src/lib/quotation/`；
- `src/actions/admin/quotation-products.ts`；
- `src/actions/admin/quotation-imports.ts`；
- `src/actions/admin/sales-quotations.ts`；
- `src/components/admin/quotation/`；
- 报价模板、字体和脱敏测试样本目录。

预计修改：

- `prisma/schema.prisma`；
- `src/components/admin/sidebar.tsx`；
- `src/lib/r2.ts` 或新增独立私有存储模块；
- `src/lib/auth-utils.ts`；
- 必要的环境变量示例和部署文档。

现有 `Quote`、`QuoteItem`、公开 `/quote` 和商城 `Product` 在首个可用版本尽量保持不变。只新增可选 `sourceInquiryId` 或转换入口时，再做最小关系扩展。

## 19. Trellis 代码规范与开发前置条件

本功能涉及数据库迁移、私有对象存储、跨层输入输出、金额计算和权限，正式开发前必须建立独立 Trellis task，并至少把以下规范加入 implement/check context：

- `.trellis/spec/backend/index.md`；
- `.trellis/spec/backend/type-safety.md`；
- `.trellis/spec/backend/database.md`；
- `.trellis/spec/backend/authentication.md`；
- `.trellis/spec/backend/error-handling.md`；
- `.trellis/spec/frontend/index.md`；
- `.trellis/spec/frontend/component-guidelines.md`；
- `.trellis/spec/shared/typescript.md`；
- 现有 Prisma、NextAuth、R2、管理员 Server Action 和上传路由作为当前项目实际模式。

开发前必须进一步输出可执行 code-spec：

- Prisma 字段、索引、外键、删除行为和迁移回滚计划；
- 所有 Zod 输入/输出 schema；
- 报价及导入状态机；
- 金额公式、舍入顺序和示例；
- 文件上传/解析/下载安全契约；
- 接口错误码；
- Good/Base/Bad 自动化用例；
- 私有存储环境变量和部署检查清单。

## 20. 数据迁移与上线策略

### 20.1 不直接批量导入历史文件

功能上线不等于立即导入所有本地草稿。推荐顺序：

1. 在开发/测试环境验证脱敏样本；
2. 生产部署空的报价工作台；
3. 选择少量真实草稿试点；
4. 用户逐批检查并确认；
5. 确认导入质量后再扩大范围。

### 20.2 现有数据保护

- 新迁移只新增报价工作台相关表和必要的可空关系；
- 不批量修改现有 `Product`；
- 不把现有客户询价自动转成正式报价；
- 不移动现有公开产品图片；
- 上线前备份数据库并验证恢复；
- 批量导入支持批次级追踪和可审计撤销，但已发出报价不随撤销删除。

### 20.3 发布验证

- 管理员页面鉴权；
- 匿名私有文件访问返回拒绝；
- 数据库迁移状态；
- 文件上传、解析、确认、报价、锁定、导出全流程；
- 现有商城产品页、客户询价和订单回归；
- 生产日志无客户文件内容和签名 URL 泄露。

## 21. 主要风险与控制措施

| 风险 | 控制措施 |
| --- | --- |
| 自动识别错误污染资料库 | 待确认区、字段证据、显式确认、禁止自动补全 |
| 历史报价被当前产品更新影响 | 报价行完整快照、已发版本锁定 |
| 客户/成本文件公开泄露 | 私有 bucket、鉴权下载、短期签名 URL |
| Excel 工作表或图片归属错误 | 用户选择工作表、原始预览、来源定位 |
| 重复产品越来越多 | 候选提示、人工合并、保留来源和审计 |
| 金额浮点误差 | Decimal 服务端计算、固定舍入规则 |
| 并发覆盖 | `expectedVersion` 乐观锁 |
| AI/OCR 不稳定 | 确定性解析优先、可重试、结果只是建议 |
| 已发文件无法复现 | 保存模板版本、快照 JSON、生成文件和哈希 |
| 模块过度耦合商城 | 新领域表、独立路由和服务、仅可选关联 `Product` |

## 22. 待用户评审的决策

以下问题不阻止阅读 v0.1，但必须在进入开发前确认：

1. **第一批文件格式**：是否确认自动提取以 Excel 和文本型 PDF 为 P0，扫描 PDF/图片先预览手工录入，Word 暂后？
2. **扫描件优先级**：首个可用版本按方案只对 Excel 和文本 PDF 自动提取；扫描 PDF/图片自动 OCR 放阶段 C，是否可以？
3. **导入自动化程度**：第一版是否接受“系统提取 + 人工确认”，而不是追求全自动？
4. **报价编号**：采用 `YLF-YYYYMMDD-NNN`，还是延续当前无连字符格式？
5. **报价语言**：第一版需要中文、英文和双语三种，还是先做中英两个单语模板？
6. **报价模板**：第一版需要几种固定模板？是否沿用已有带公司信息、公章和签名的模板？
7. **客户版图片**：默认展示所有产品图片，还是每个产品只显示主图？
8. **价格结构**：第一版是否需要运费、折扣、税费和其他费用全部独立列出？
9. **内部成本**：是否需要记录供应商、采购币种、采购价、汇率和利润率？首版只有 `ADMIN` 可见，是否正确？
10. **私有文件保留期限**：是否接受“已确认/已定稿长期保留，未确认无引用批次 30 天清理”的默认值？
11. **旧报价导入目标**：历史报价导入时，默认同时把确认后的产品建入报价产品库，还是允许逐行选择？本方案建议逐行选择。
12. **客户资料**：第一版是否需要一个客户多个联系人？
13. **转商城产品**：本方案放到阶段 C，不进入首个可用版本，是否正确？
14. **正式发出定义**：本方案要求先成功生成并锁定客户 PDF，再由用户下载发送并手工标记“已发出”，是否正确？
15. **邮件发送**：第一版只下载文件，由用户自行发邮件，是否正确？
16. **生产部署边界**：评审通过后先本地/测试环境开发和验收，生产部署另行确认，是否正确？

## 23. 建议评审结论格式

评审时可以直接回复：

```text
总体结论：通过 / 修改后通过 / 不通过

保留：第 X、X、X 节
修改：第 X 节，改为……
删除：第 X 节，因为……

待决策回答：
1. ...
2. ...
...

是否允许进入开发准备：是 / 否
是否允许创建 Trellis task：是 / 否
是否允许修改数据库 schema：是 / 否
是否允许使用脱敏样本测试：是 / 否
是否允许生产部署：否，需再次确认
```

## 24. 当前结论

当前建议批准的是“方案方向”，不是任何数据或生产变更。即使本方案评审通过，下一步也应先创建开发任务、补充 code-spec、确认脱敏样本和私有存储方案，然后才进入实现。
