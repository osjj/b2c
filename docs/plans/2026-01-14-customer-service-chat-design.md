# 客服在线聊天功能设计

## 概述

为 B2C 电商平台实现统一的在线客服功能，支持售前咨询和售后支持。使用 Pusher 作为实时通信层，消息持久化存储在数据库中。

## 需求概要

| 需求项 | 说明 |
|--------|------|
| 客服类型 | 通用客服（售前+售后） |
| 通信方式 | 实时在线聊天 |
| 客服工作台 | 集成在现有后台 `/admin/chat` |
| 消息类型 | 文字、图片、文件附件 |
| 客户上下文 | 显示订单历史、购物车、浏览记录 |
| 游客支持 | 未登录用户也可发起咨询 |
| 消息通知 | 浏览器桌面通知 + 声音提示 |
| 历史记录 | 永久保留 |

---

## 一、数据模型

在 Prisma 中新增以下模型：

```prisma
enum SessionStatus {
  ACTIVE
  CLOSED
}

enum SenderType {
  CUSTOMER
  STAFF
}

enum AttachmentType {
  IMAGE
  FILE
}

// 聊天会话
model ChatSession {
  id          String        @id @default(cuid())
  visitorId   String?       // 游客标识（未登录时）
  userId      String?       // 用户 ID（登录后）
  user        User?         @relation(fields: [userId], references: [id])
  status      SessionStatus @default(ACTIVE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  messages    ChatMessage[]

  @@index([visitorId])
  @@index([userId])
  @@index([status])
}

// 聊天消息
model ChatMessage {
  id          String           @id @default(cuid())
  sessionId   String
  session     ChatSession      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  senderType  SenderType
  senderId    String?          // 客服的 userId（客户消息为空）
  content     String           @db.Text
  attachments ChatAttachment[]
  createdAt   DateTime         @default(now())

  @@index([sessionId])
}

// 附件（图片/文件）
model ChatAttachment {
  id        String         @id @default(cuid())
  messageId String
  message   ChatMessage    @relation(fields: [messageId], references: [id], onDelete: Cascade)
  type      AttachmentType
  url       String
  fileName  String
  fileSize  Int
  createdAt DateTime       @default(now())

  @@index([messageId])
}
```

**说明：**
- 游客用 `visitorId`（浏览器生成的 UUID）追踪，登录后可关联到 `userId`
- 一个会话包含多条消息，消息可带多个附件
- 客服回复时记录 `senderId`，方便追溯

---

## 二、前台客户侧界面

### 2.1 聊天入口

在页面右下角添加悬浮聊天按钮，点击展开聊天窗口：

```
┌──────────────────────────────────────────┐
│  商品页面 / 任意页面                        │
│                                          │
│                                          │
│                              ┌─────────┐ │
│                              │   💬    │ │  ← 悬浮按钮（有未读时显示红点）
│                              └─────────┘ │
└──────────────────────────────────────────┘
```

### 2.2 聊天窗口

```
┌─────────────────────────────┐
│  在线客服            ─  ✕  │  ← 可最小化/关闭
├─────────────────────────────┤
│                             │
│  客服: 您好，有什么可以帮您？ │
│                             │
│         我想问下这个商品... │  ← 客户消息靠右
│                    [图片]   │  ← 支持发图
│                             │
├─────────────────────────────┤
│  📎  输入消息...      发送  │  ← 输入框 + 附件按钮
└─────────────────────────────┘
```

### 2.3 组件结构

```
src/components/store/chat/
├── chat-widget.tsx      # 悬浮按钮 + 窗口容器
├── chat-window.tsx      # 聊天窗口主体
├── chat-messages.tsx    # 消息列表
├── chat-input.tsx       # 输入框 + 附件上传
└── chat-bubble.tsx      # 单条消息气泡
```

### 2.4 游客处理

- 首次打开时生成 UUID 存入 localStorage
- 后续使用同一标识追踪会话
- 登录后自动关联到用户账号

---

## 三、后台客服管理界面

路径：`/admin/chat`

### 3.1 界面布局

```
┌────────────────────────────────────────────────────────────────────┐
│  后台顶栏                                          🔔 3 条新消息   │
├──────────┬─────────────────────────────────┬───────────────────────┤
│ 会话列表  │         对话区域                │     客户信息         │
│          │                                 │                       │
│ ● 游客A  │  游客A: 这个商品有货吗？          │  👤 游客              │
│   2分钟前 │                                 │  访客ID: abc123       │
│          │         有的，现在可以下单        │                       │
│ ○ 张三   │                                 │  ─────────────────    │
│   10分钟前│  游客A: 好的，怎么付款？          │  📦 最近订单          │
│          │                                 │  暂无订单             │
│ ○ 李四   │         支持微信、支付宝...       │                       │
│   1小时前 │                                 │  🛒 当前购物车         │
│          │                                 │  商品A x1  ¥299       │
│ ──────── │                                 │                       │
│ 已关闭 ▼ │                                 │  📍 浏览轨迹          │
│          ├─────────────────────────────────│  商品A详情页          │
│          │  📎  输入回复...          发送  │  首页                 │
└──────────┴─────────────────────────────────┴───────────────────────┘
```

### 3.2 功能说明

| 区域 | 功能 |
|------|------|
| 会话列表 | 显示所有会话，未读消息加粗，支持按状态筛选（活跃/已关闭） |
| 对话区域 | 查看历史消息，发送回复，支持图片/文件 |
| 客户信息 | 显示用户资料、订单历史、购物车、浏览记录 |

### 3.3 文件结构

```
src/app/admin/chat/
├── page.tsx              # 客服主页面
└── components/
    ├── session-list.tsx      # 会话列表
    ├── chat-area.tsx         # 对话区域
    ├── customer-context.tsx  # 客户信息面板
    └── session-filters.tsx   # 筛选器
```

---

## 四、Pusher 实时通信架构

### 4.1 频道设计

```
chat-session-{sessionId}    # 每个会话一个频道
admin-notifications         # 后台通知频道（新会话提醒）
```

### 4.2 消息流程

**客户发送消息：**
```
客户输入 → API /api/chat/send → 保存到数据库 → Pusher 推送 → 客服收到
```

**客服回复消息：**
```
客服输入 → API /api/chat/send → 保存到数据库 → Pusher 推送 → 客户收到
```

### 4.3 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/chat/sessions | 创建/获取会话 |
| GET | /api/chat/sessions | 获取会话列表（后台用） |
| GET | /api/chat/sessions/[id] | 获取会话详情 + 历史消息 |
| POST | /api/chat/send | 发送消息 |
| POST | /api/chat/upload | 上传附件 |
| POST | /api/chat/close | 关闭会话 |

### 4.4 通知机制

```
1. Pusher 事件触发
2. 播放提示音
3. 更新页面未读角标
4. 如果页面不在前台 → 发送浏览器通知
```

### 4.5 环境变量

```env
PUSHER_APP_ID=xxx
PUSHER_KEY=xxx
PUSHER_SECRET=xxx
PUSHER_CLUSTER=xxx
NEXT_PUBLIC_PUSHER_KEY=xxx
NEXT_PUBLIC_PUSHER_CLUSTER=xxx
```

---

## 五、附件上传

### 5.1 复用现有 S3

复用项目现有的 S3 上传能力（`@aws-sdk/client-s3`）。

### 5.2 文件限制

| 类型 | 格式 | 大小限制 |
|------|------|----------|
| 图片 | JPG/PNG/GIF | 10MB |
| 文件 | PDF/DOC/DOCX/XLS | 20MB |

### 5.3 文件结构

```
src/lib/
├── s3.ts           # 现有 S3 工具
└── chat-upload.ts  # 聊天附件上传（复用 s3.ts）
```

---

## 六、其他细节

### 6.1 游客转用户

当游客登录后，自动将其 `visitorId` 关联的会话迁移到 `userId`：

```typescript
await mergeGuestSessions(visitorId, userId)
```

### 6.2 会话超时

- 客户 30 分钟无活动 → 会话自动标记为"已关闭"
- 可由客服手动重新激活

### 6.3 安全考虑

- 客户只能访问自己的会话（通过 visitorId 或 userId 验证）
- 客服接口需要管理员权限校验
- 附件上传校验文件类型，防止恶意文件

---

## 七、依赖安装

```bash
npm install pusher pusher-js
```

---

## 八、实现模块清单

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据库 | prisma/schema.prisma | 新增 3 个模型 |
| Pusher 配置 | src/lib/pusher.ts | 服务端 + 客户端配置 |
| API 接口 | src/app/api/chat/* | 会话和消息接口 |
| 前台组件 | src/components/store/chat/* | 悬浮按钮 + 聊天窗口 |
| 后台页面 | src/app/admin/chat/* | 客服工作台 |
| 附件上传 | src/lib/chat-upload.ts | 聊天附件处理 |
