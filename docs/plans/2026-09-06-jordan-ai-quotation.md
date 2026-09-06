# Jordan 模板与现有 AI 接口接入

## 本轮实现

原始参考为 `Yuelaifa_PPE_Quotation_Jordan_20260831_USD_Price_Updated.pdf`（7 页横版 A4，SHA-256 记录在 `src/lib/quotation/jordan-layout.ts`）。这是静态成品 PDF，不是可填写表单。

已将其版式转为内置 `jordan-ai-v1` 模板：首屏公司信息、后续页简洁页眉、深蓝表头、产品大图、规格标签加粗、订单数量/尺寸备注框，末页合并汇总；空间不足自动续页。原 PDF 保持不变，没有复制到公开目录或上传 AI。

公司抬头、联系方式、Logo、印章继续来自报价设置。旧 Jordan 客户、价格、认证声明、分组小计、汇率条款及印章不会自动复用。本版保留相近视觉结构，但不是覆盖原 PDF 页面，也不是逐像素复制。

## 使用方式

1. 新建报价，或保存一份可编辑草稿，使用新版模板。旧正式文件不重新生成、不覆盖。
2. “预览 PDF”：保存草稿后由本地模板生成，不调用 AI、不产生 API 费用，带预览标记并省略印章。
3. “生成正式文件”：确认 AI 数据范围和可能产生的调用费用后，调用 AI 辅助排版，生成 PDF、客户 Excel、内部估值 Excel 和快照 JSON。
4. AI 的排版结果与模型名、输入摘要哈希一起存入正式快照。重复同一成功请求不会再次调用 AI。PDF/Excel 中的产品文字及数字保持系统原值。

AI 只决定图片一列/两列、已有规格标签的加粗范围，以及哪些现有规格可在备注框重复显示。**不会自动润色、翻译、编造参数或生成产品图片，也不生成可执行 HTML。** 预览与正式版的这些排版细节可能不同。

## 接口与数据边界

- 复用服务器现有 `OPENAI_API_ENDPOINT` 和 `OPENAI_API_KEY`。
- 用户指定的根地址对应 `https://chat.glarivoglass.com/v1/chat/completions`；也接受以 `/v1` 或完整聊天接口结尾的配置，不重复拼接路径。
- 默认模型为项目现有文字适配器使用的 `gpt-5.4`。只有需要改模型时才设置可选 `QUOTATION_AI_MODEL`，无需新增必填配置。
- 仅向配置的接口发送产品名称、规格文字、图片数量；不发送客户字段、金额、数量、条款、图片文件、Logo、印章、内部成本或私有存储地址。不要把敏感信息手工写进产品规格字段。
- 单次最多 100 项产品、60 KB 输入；90 秒超时；响应最大 128 KB。HTTP 错误、截断响应或不符合约束的结果会明确失败，不自动重试，不静默使用未知结果。
- AI 失败沿用现有生成补偿流程，恢复为草稿状态（内部 READY）并保留安全的错误阶段和引用编号。手动重试可能再次产生 API 费用。
- 使用报价专用适配器，避免改动原有商城 AI 功能或把上游原始错误/密钥输出到日志。

## 本地验证

- `node node_modules/tsx/dist/cli.mjs --test src/lib/quotation/*.test.ts`：42 项通过（包括 6 项 AI/模板测试）。
- `node scripts/test-quotation-ai-finalize.mjs`：真实生成服务与实际 PDF/Excel 渲染，外部 I/O 使用替身；验证保存 AI 快照、成功请求幂等复用、AI 失败恢复草稿且无正式文件。
- `node scripts/test-quotation-write-boundaries.mjs`：8 项写入边界用例。
- `node scripts/test-quotation-upload.mjs`：10 项上传回归，不需要安全扫描器。
- 样例：`node node_modules/tsx/dist/cli.mjs scripts/preview-simple-quotation.ts --jordan`，使用合成产品及离线排版结果，不调用 API。输出 `output/pdf/quotation-jordan-template-preview.pdf`。
- 全项目 TypeScript 原有 7 处非报价错误仍需处理；不能据此声称生产构建通过。

## 尚未执行

没有改动 `.env`、线上数据库、R2 配置，也没有部署或推送。没有向现有 AI 接口发起真实模型请求；当前成功结果是模拟兼容响应验证，真实模型可用性、接口参数兼容性和时延需要后续用非敏感样例联调确认。

上线前需在隔离数据库验证全流程、确认服务器配置已加载，并完成生产构建和原业务回归。原 PDF 的本地 Downloads 路径不是服务器运行依赖。
