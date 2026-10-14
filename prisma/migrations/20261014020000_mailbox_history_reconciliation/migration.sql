-- Only extend the private mailbox tables introduced by 20261014010000.
-- Existing mail bytes, conversation rows and history dates remain unchanged.
ALTER TABLE "admin_mailbox_sync_states"
  ADD COLUMN "scopeHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "scanGeneration" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "generationImported" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "admin_mailbox_cursors"
  ADD COLUMN "scanGeneration" INTEGER NOT NULL DEFAULT 0;
