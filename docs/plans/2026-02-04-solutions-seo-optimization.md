# Solutions Page SEO Optimization Design

## Overview

优化 solutions 页面的内容 SEO，将目标受众从泛用户转向 B2B 采购决策者（企业安全经理、采购人员、分销商）。

## 目标

- 提升 B2B 采购相关关键词的搜索排名
- 增加来自采购决策者的有机流量
- 提高页面与采购意图的相关性

## 优化策略

### 1. Meta 信息优化

#### metaTitle 优化原则
- 加入 "Supplier"、"Manufacturer"、"Wholesale" 等 B2B 身份词
- 包含 "Bulk"、"OEM" 等采购意图词
- 控制在 60 字符以内

**示例（Construction）**:
- Before: `PPE Safety Equipment for Construction Sites | Complete Guide`
- After: `Construction PPE Supplier | Bulk Safety Equipment & OEM Solutions`

#### metaDescription 优化原则
- 开头包含 "Wholesale" 或 "Bulk" 等采购词
- 突出供应商能力：OEM customization、compliance documentation、volume pricing
- 提及目标客户：contractors、distributors
- 控制在 155 字符以内

**示例（Construction）**:
- Before: `Complete PPE guide for construction sites including helmets, gloves, boots, fall protection and safety standards for compliance.`
- After: `Wholesale construction PPE from certified manufacturer. Hard hats, safety boots, gloves with OEM customization, compliance documentation, and volume pricing for contractors and distributors.`

#### metaKeywords 优化原则
- 移除纯产品词（如 "hard hats"、"safety boots"）
- 增加采购意图词组合（如 "bulk hard hats supplier"、"OEM safety boots"）
- 包含认证相关词（如 "ANSI certified PPE"）

### 2. 关键词三层策略

| 层级 | 类型 | 示例 | 植入位置 |
|-----|------|------|---------|
| 第一层 | 核心采购词 | construction PPE supplier, wholesale safety equipment | metaTitle, H1, 首段 |
| 第二层 | 产品+采购意图词 | bulk hard hats supplier, OEM work gloves | metaDescription, H2, PPE描述 |
| 第三层 | 长尾采购词 | ANSI certified hard hat supplier | FAQ答案, Standards段落 |

### 3. FAQ 内容重写

将产品知识导向的 FAQ 改为采购决策导向。

#### 标准 FAQ 问题模板（适用所有行业）

1. **What is the minimum order quantity (MOQ) for [industry] PPE?**
   - 包含各产品类别的具体 MOQ
   - 提及首单灵活政策和样品订单

2. **Can you provide OEM/ODM customization for [industry] PPE?**
   - 列出定制能力：branding、color、logo、packaging
   - 提及 private label 起订量

3. **What certifications and compliance documents do you provide?**
   - 列出相关标准：ANSI、EN、CE、ISO
   - 提及 test reports、declaration of conformity

4. **What is the typical lead time for bulk [industry] PPE orders?**
   - 标准品交期
   - 定制品交期
   - 安全库存政策

5. **Do you offer volume pricing or distributor discounts?**
   - 阶梯价格起点
   - 年度合同优惠
   - 分销商合作政策

### 4. PPE Categories 描述优化

在现有产品功能描述基础上，增加供应能力信息：

**优化模板**:
```
[认证标准] certified [产品名] available in bulk quantities.
OEM customization includes [定制项]. MOQ [数量] with [交期] delivery.
```

**示例**:
- Before: `ANSI-compliant safety helmets protecting workers from falling tools, debris, and impact hazards.`
- After: `ANSI Z89.1 certified safety helmets available in bulk quantities. OEM customization includes logo printing, color matching, and custom suspension systems. MOQ 500 pcs with 15-day delivery.`

## 实施清单

### solutions-data.json 修改项

- [x] metaTitle - 改为 B2B 供应商定位
- [x] metaDescription - 突出批量采购和 OEM 能力
- [x] metaKeywords - 替换为采购意图关键词
- [x] faqContent - 重写为 5 个采购决策问题
- [x] ppeCategories.description - 增加供应能力描述

### 后续扩展（可选）

- [ ] 为其他行业（Chemical、Manufacturing 等）创建类似优化
- [ ] 在页面添加 FAQ Schema 结构化数据（技术 SEO）
- [ ] 将 solutions 页面加入 sitemap.ts

## 预期效果

1. **搜索排名**：3-6 个月内在 "construction PPE supplier"、"wholesale safety equipment" 等关键词获得排名
2. **流量质量**：吸引更多 B2B 采购意图流量，降低跳出率
3. **询盘转化**：页面内容与采购决策流程匹配，提升 RFQ 转化率
