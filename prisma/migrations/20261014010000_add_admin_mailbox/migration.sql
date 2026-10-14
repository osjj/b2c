-- Private mailbox storage only; no existing business tables are modified.
CREATE TYPE "AdminMailboxDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TABLE "admin_mailbox_messages" (
  "id" TEXT NOT NULL, "account" TEXT NOT NULL,
  "direction" "AdminMailboxDirection" NOT NULL, "messageId" TEXT,
  "dedupeKey" TEXT NOT NULL, "threadKey" TEXT NOT NULL,
  "fromAddress" TEXT NOT NULL, "fromName" TEXT,
  "replyTo" JSONB NOT NULL, "to" JSONB NOT NULL, "cc" JSONB NOT NULL,
  "subject" TEXT NOT NULL, "textBody" TEXT NOT NULL, "preview" TEXT NOT NULL DEFAULT '',
  "sentAt" TIMESTAMP(3) NOT NULL,
  "references" TEXT[] NOT NULL, "inReplyTo" TEXT[] NOT NULL,
  "rawMime" BYTEA, "attachments" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_mailbox_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_mailbox_messages_account_dedupeKey_key" ON "admin_mailbox_messages"("account", "dedupeKey");
CREATE UNIQUE INDEX "admin_mailbox_messages_account_messageId_key" ON "admin_mailbox_messages"("account", "messageId");
CREATE INDEX "admin_mailbox_messages_account_threadKey_sentAt_idx" ON "admin_mailbox_messages"("account", "threadKey", "sentAt");
CREATE INDEX "admin_mailbox_messages_account_sentAt_idx" ON "admin_mailbox_messages"("account", "sentAt");

CREATE TABLE "admin_mailbox_sync_states" (
  "account" TEXT NOT NULL, "lockToken" TEXT, "leaseUntil" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_mailbox_sync_states_pkey" PRIMARY KEY ("account")
);
CREATE TABLE "admin_mailbox_cursors" (
  "id" TEXT NOT NULL, "account" TEXT NOT NULL, "folder" TEXT NOT NULL,
  "since" TIMESTAMP(3) NOT NULL, "uidValidity" TEXT NOT NULL,
  "backfillUid" INTEGER NOT NULL DEFAULT 0, "backfillUpperUid" INTEGER NOT NULL,
  "latestUid" INTEGER NOT NULL, "backfillComplete" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_mailbox_cursors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_mailbox_cursors_account_folder_key" ON "admin_mailbox_cursors"("account", "folder");
CREATE TABLE "admin_mailbox_send_attempts" (
  "id" TEXT NOT NULL, "requestKey" UUID NOT NULL, "account" TEXT NOT NULL,
  "parentId" TEXT NOT NULL, "payloadHash" TEXT NOT NULL, "status" TEXT NOT NULL,
  "messageId" TEXT NOT NULL, "outboundMessageId" TEXT, "providerRequestId" TEXT, "safeErrorCode" TEXT,
  "rawMime" BYTEA, "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_mailbox_send_attempts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_mailbox_send_attempts_requestKey_key" ON "admin_mailbox_send_attempts"("requestKey");
CREATE INDEX "admin_mailbox_send_attempts_account_parentId_idx" ON "admin_mailbox_send_attempts"("account", "parentId");
