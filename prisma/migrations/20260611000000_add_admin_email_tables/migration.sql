-- CreateTable
CREATE TABLE "admin_email_messages" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message_mode" TEXT NOT NULL,
    "editor_content" JSONB,
    "preview_text" TEXT NOT NULL,
    "html_body" TEXT,
    "text_body" TEXT NOT NULL,
    "sent_by" TEXT NOT NULL,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_email_recipient_logs" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipient_normalized" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_email_recipient_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_email_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_provider" TEXT NOT NULL DEFAULT 'r2',
    "storage_bucket" TEXT,
    "storage_key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "admin_email_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_email_messages_created_at_idx" ON "admin_email_messages"("created_at");

-- CreateIndex
CREATE INDEX "admin_email_messages_request_id_idx" ON "admin_email_messages"("request_id");

-- CreateIndex
CREATE INDEX "admin_email_recipient_logs_message_id_idx" ON "admin_email_recipient_logs"("message_id");

-- CreateIndex
CREATE INDEX "admin_email_recipient_logs_recipient_normalized_created_at_idx" ON "admin_email_recipient_logs"("recipient_normalized", "created_at");

-- CreateIndex
CREATE INDEX "admin_email_attachments_message_id_idx" ON "admin_email_attachments"("message_id");

-- CreateIndex
CREATE INDEX "admin_email_attachments_storage_key_idx" ON "admin_email_attachments"("storage_key");

-- CreateIndex
CREATE INDEX "admin_email_attachments_sha256_idx" ON "admin_email_attachments"("sha256");

-- AddForeignKey
ALTER TABLE "admin_email_recipient_logs" ADD CONSTRAINT "admin_email_recipient_logs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "admin_email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_email_attachments" ADD CONSTRAINT "admin_email_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "admin_email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
