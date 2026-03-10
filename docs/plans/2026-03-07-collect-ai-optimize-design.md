# 采集页 AI 优化功能设计

**日期**: 2026-03-07
**页面**: `/admin/products/collect`
**状态**: 已批准，待实现

---

## 需求概述

在 1688 商品采集完成后，提供两类 AI 优化能力：

1. **文本一键 AI 优化**：将采集到的名称、描述、规格参数翻译并改写成专业英文电商文案（使用 OpenAI API）
2. **图片 AI 生成**：在主图和详情图区域分别提供 AI 生成按钮，通过弹框选图+输入 prompt 进行图片重新生成（使用第三方图片 API `NEXT_PUBLIC_THIRD_PARTY_IMAGE_URL`）

---

## 架构设计

### 方案选择

采用**方案 B：独立组件**，新建组件文件和 API Route，不把逻辑堆入现有表单。

### 文件变动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/app/api/ai/optimize-collect-text/route.ts` | 文本优化 API Route |
| 新建 | `src/components/admin/collect-image-ai-dialog.tsx` | 图片 AI 生成弹框组件 |
| 修改 | `src/components/admin/product-collect-form.tsx` | 添加按钮入口和状态 |

---

## 功能设计

### 1. 文本 AI 优化

**入口**：基本信息 Card 右上角 `AI 优化文本` 按钮

**API Route**: `POST /api/ai/optimize-collect-text`

请求体：
```json
{
  "name": "商品名称",
  "description": "商品描述",
  "specifications": { "key": "value" }
}
```

响应体：
```json
{
  "success": true,
  "name": "Optimized English Name",
  "description": "Optimized English description...",
  "specifications": { "Key": "Value" }
}
```

**OpenAI Prompt 方向**：将中文电商内容翻译并改写为专业英文 B2B/B2C 电商文案，保留技术规格的准确性，语言简洁专业。

**交互流程**：
1. 点击按钮 → 按钮变为 loading 状态
2. 调用 API → 返回结果后更新 `data` state
3. 表单字段即时刷新显示优化后内容

---

### 2. 图片 AI 生成弹框

**入口**：主图 Card 和详情图 Card 标题行各加一个 `AI 生成` 按钮

**组件**: `CollectImageAIDialog`

**Props**:
```ts
interface CollectImageAIDialogProps {
  open: boolean
  onClose: () => void
  images: string[]              // 该 section 全部图片 URL
  selectedImages: Set<string>   // 当前已选中的图片
  onImagesUpdate: (newImages: string[], newSelected: Set<string>) => void
}
```

**弹框 UI 布局**：
```
┌─ AI 图片生成 ────────────────────────────────┐
│ 选择参考图（可多选，不选则纯文本生成）           │
│ [图1 ✓][图2  ][图3 ✓] ...                   │
│                                               │
│ 提示词                                        │
│ [__________________________________]          │
│                                               │
│ 预置 Prompt：                                 │
│ [把图片文本全改成英文] [删除图片Logo]           │
│                                               │
│             [开始生成] [取消]                  │
└───────────────────────────────────────────────┘
```

**预置 Prompt 内容**：
1. `Change all text in the image to English, regenerate the image, keep all other visual elements unchanged`
2. `Remove the logo from the image, regenerate the image, keep all other visual elements unchanged`

点击预置 prompt → 填入输入框（可继续编辑）

**生成逻辑**：
- **有参考图选中**：对每张选中的参考图单独调用 `/api/ai/generate-image-third-party`，生成1张新图，**替换**原图在数组中的位置
- **无参考图选中**：仅用 prompt 调用 API 一次，生成1张图，**追加**到列表末尾
- 生成过程中按钮 loading，逐图完成后实时更新预览
- 同步更新父组件的 selectedImages Set（旧 URL 换为新 URL）

**API 调用参数**（复用已有路由）：
```json
{
  "url": "NEXT_PUBLIC_THIRD_PARTY_IMAGE_URL",
  "apiKey": "NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY",
  "model": "NEXT_PUBLIC_THIRD_PARTY_IMAGE_MODEL",
  "prompt": "用户输入的 prompt",
  "referenceImages": ["源图 URL"]
}
```

---

## 数据流

```
product-collect-form.tsx
├── [AI优化文本] 按钮
│   └── POST /api/ai/optimize-collect-text
│       └── 更新 data.name / data.description / data.specifications
│
├── 主图 Card [AI生成] 按钮
│   └── CollectImageAIDialog (images=data.mainImages, selected=selectedMain)
│       └── POST /api/ai/generate-image-third-party (每张图)
│           └── onImagesUpdate → 替换/追加 data.mainImages + selectedMain
│
└── 详情图 Card [AI生成] 按钮
    └── CollectImageAIDialog (images=data.detailImages, selected=selectedDetail)
        └── POST /api/ai/generate-image-third-party (每张图)
            └── onImagesUpdate → 替换/追加 data.detailImages + selectedDetail
```

---

## 注意事项

- 图片生成使用 `NEXT_PUBLIC_*` 环境变量，直接在客户端组件中读取
- 第三方图片 API 是异步轮询模式（已有实现），单张图约 30-60s，多图并行生成
- 文本优化 API 走服务端（不暴露 OpenAI key），调用时间约 5-15s
- 生成中状态要有明显 loading 反馈，防止重复点击
