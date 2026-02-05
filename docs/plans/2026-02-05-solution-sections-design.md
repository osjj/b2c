# 2026-02-05 Solution Sections Design

## 目标
- 解决方案详情页不再使用固定字段（hazards/standards/faq 等），改为 Section 结构化内容。
- Standards 与 FAQ 作为 Section 类型之一，不保留独立字段。
- 详情页内容以 admin 配置为准，支持模板化扩展。

## 数据模型
- Solution：仅保留基础字段（slug/title/excerpt/coverImage/usageScenes/isActive/sortOrder/SEO）。
- SolutionSection：按 sort 排序，存储结构化区块。

Section 结构：
- 公共字段：key, type, title, enabled, data
- 类型枚举：hero / paragraphs / list / table / group / callout / cta / faq

Section data 结构：
- hero: { intro: string, bullets?: string[] }
- paragraphs: { paragraphs: string[] }
- list: { items: { title?: string, text?: string }[] }
- table: { headers: string[], rows: string[][] }
- group: { groups: { title: string, items: string[] }[] }
- callout: { text: string }
- cta: { title: string, text: string, primaryLabel: string, primaryHref: string, secondaryLabel?: string, secondaryHref?: string }
- faq: { items: { q: string, a: string }[] }

## 后台编辑（Admin）
- 基础信息区：title/slug/excerpt/usageScenes/coverImage/status/seo。
- Sections 编辑器：
  - 可新增/删除/排序区块。
  - 区块类型可切换，分别提供对应表单。
  - 保存时输出结构化 JSON 到 SolutionSection.data。

## 前台渲染（Store）
- /solutions/[slug] 读取 Solution + sections（按 sort）。
- Hero 使用 Solution.title/excerpt，若存在 hero section，则展示其 intro/bullets。
- 其余区块由 SectionRenderer 按 type 映射渲染。
- TOC（可选）：根据 section.title + key 生成锚点。

## 兼容性与迁移
- 现有 Solution 数据已清空，无需迁移旧字段。
- 新增模型替换旧 Solution 字段，移除 hazards/standards/faq/ppe/materials。

## 风险与测试
- 需确保 sections JSON 序列化/反序列化稳定。
- 后台表单需保证 key 唯一与排序稳定。
- 手工验证：新增/编辑/删除 section 后前台正确渲染。
