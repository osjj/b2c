# Admin mailbox: QQ history and threaded replies

Incoming mail continues to follow the existing Cloudflare forwarding rule to QQ. Administrators synchronize business correspondence over TLS IMAP and reply through the existing SMTP2GO account at `/admin/email`. This feature does not change DNS or Cloudflare routing.

## 后台使用

1. 打开后台 **Email → 收件与会话回复**，点击「同步邮件」。历史较多时点「继续同步下一批」，也可通过下面的命令连续处理。
2. 搜索主题或联系人，打开已有会话，点击对应邮件的「回复此邮件」或「回复全部」。核对收件人和抄送，输入本次回复；可以勾选引用原文并添加新附件。
3. 发件地址使用 `sales@laifappe.com`，回复会携带原邮件的会话标识。发送结果不明确时，先点「查询发送状态」并核对 SMTP2GO 记录；界面会阻止直接重复发送。
4. 「写新邮件与发送记录」保留原有写信功能。后台发送的回复保存到后台会话，不会自动出现在 QQ 的「已发送」。新来信会在下一次同步后出现。

首次默认同步最近 90 天；选择更早日期可以补充更早历史。源码和本机环境配置完成后，还需把相同版本、迁移及受保护的环境配置部署到实际运行后台的服务器，线上页面才会出现此功能。

## Protected server configuration

Set these values in the actual application's protected environment (`.env.local` takes precedence over `.env`). Never commit an authorization code or paste it into a customer message.

```dotenv
MAILBOX_IMAP_HOST="imap.qq.com"
MAILBOX_IMAP_PORT="993"
MAILBOX_IMAP_USER="your-account@qq.com"
MAILBOX_IMAP_PASSWORD="your-QQ-authorization-code"
MAILBOX_ALIASES="sales@laifappe.com"
SMTP2GO_API_KEY="existing-SMTP2GO-key"
SMTP2GO_DEFAULT_SENDER="sales@laifappe.com"
# Optional fixed historical boundary; otherwise initially 90 days, then persisted.
# MAILBOX_SYNC_SINCE="2026-07-16"
# Usually auto-detected: INBOX and the special-use Sent folder.
# MAILBOX_IMAP_FOLDERS="INBOX,Sent Messages"
```

QQ: account and security → security settings → IMAP/SMTP service → generate authorization code. Complete QQ's own identity verification. The login uses the authorization code, not the QQ sign-in password. Restart the application after updating its environment.

## Database and verification

1. Install dependencies with `npm ci` and regenerate Prisma with `npm run sync`.
2. Review `prisma migrate status`. The additive migration `20261014010000_add_admin_mailbox` creates four private tables and one direction enum; `20261014020000_mailbox_history_reconciliation` adds four progress fields to those new tables. Neither rewrites legacy send history. Apply with `npm run db:deploy` only after checking other pending migrations.
3. Run `npm run mailbox:verify`. It connects to QQ, lists folder metadata and opens INBOX read-only. It never sends, marks read, moves or deletes a message. Output excludes credentials and message contents.
4. Run `npm run mailbox:sync` for a bounded initial import. Repeat while `hasMore` is true. Alternatively use the date field and sync button in `/admin/email`. Each run saves progress; an earlier date expands the backfill. `npm run mailbox:sync -- --since=YYYY-MM-DD` selects an explicit boundary.
5. Run `npm run test:mailbox`. All sending tests use fake providers and fixture mail.

For several sequential batches, use `npm run mailbox:sync -- --batches=20`. The accepted range is 1–100 and the default is one batch. The command stops early when `hasMore` becomes false; each batch retains the same limits and persisted history boundary. Add `--diagnostics` for a fixed operation stage and safe error code, without message contents or credentials.

For read-only progress checks, run `npx tsx scripts/inspect-admin-mailbox-state.ts`. It reports message counts and cursor/generation metadata. `--remote-counts` also counts the selected QQ folders' date-window messages and direct alias matches without downloading bodies. `--search=YOUR_SUBJECT_FRAGMENT` inspects matching stored message IDs as presence flags, Cc/attachment counts and MIME attachment kinds; it does not print addresses or bodies. `npm run mailbox:verify` remains the connection-only check.

To keep new mail up to date, configure your deployment host's scheduler to run `npm run mailbox:sync` from the application directory every few minutes. Overlapping invocations are rejected by a database lease. The application includes the command but does not install or alter an operating-system scheduler automatically. The manual sync button works without a scheduler.

## Scope and storage

- Import only configured enterprise aliases in From, To, Cc or delivery headers, or protocol-linked messages belonging to existing business conversations. Personal QQ correspondence with no business association is not imported. QQ-sent replies from the personal QQ address require a protocol link to imported business mail; matching subjects alone are not sufficient.
- Default folders are INBOX plus detected Sent; other folders, junk and deleted mail are not scanned unless explicitly configured. Fetches use read-only IMAP and never alter QQ flags.
- Each batch inspects at most 100 headers per pass and processes at most 50 relevant messages per folder. Work has a 45-second soft deadline, a 75-second hard IMAP deadline and a 120-second route budget, allowing the last remote database transaction to finish. Inbox history is established before importing related QQ Sent history. Interrupted runs retain checkpoints; replay is deduplicated. An oversized or malformed relevant message produces an explicit error rather than silently skipping it.
- A scope hash tracks approved aliases and folders. Changing them restarts bounded backfill within the saved date window. Reference discovery can recover a direct-to-QQ reply whose parent is found later in Sent, or a sent root referenced by an incoming business message. After new imports, bounded header searches probe new message IDs and missing ancestors. Another history pass starts only when linked unimported mail is found or a probe exceeds its safety bounds. Ordinary replies to known conversations and idle syncs do not automatically rescan all 90 days.
- A durable import counter survives partial batches. New message storage and this counter commit together; backend reply records are excluded from the discovery set. If a batch has too little time left for discovery, a later batch resumes the decision. A probe that cannot finish within a fresh batch falls back to resumable history scanning.
- Original MIME (maximum 25 MiB per message), attachment bytes and headers are stored in PostgreSQL private mailbox tables. No received attachments go to public R2. Include these tables in normal database backups and capacity planning. Lists fetch only metadata; attachments require ADMIN authorization and download with `nosniff`.
- Stored attachment metadata includes inline MIME parts, such as signature images, as well as ordinary files. QQ may display only the ordinary files in its attachment count.
- Conversations use Message-ID, In-Reply-To and References, not subject-only grouping. Legacy admin send records lacking RFC IDs remain in their separate history.
- Preview shows plain text and blocks remote image/tracking requests. Detail views report when a very long thread is truncated.

## Reply behavior

- Reply uses the original Reply-To, otherwise From. Reply-all also includes external To/Cc and removes own aliases, QQ login, duplicates and SRS forwarding identities. Review the editable recipients before sending.
- The server chooses the approved enterprise sender, loads the original parent and uses SMTP2GO's standard `/email/send` endpoint with the original subject chain and custom `Message-ID`, `In-Reply-To`, and `References` headers. A missing original Message-ID cannot be fabricated. The private local MIME archive preserves reply text and attachments; it is not a byte-for-byte copy of the provider's transport MIME.
- Optional original text is quoted. New attachments are private and limited to five files, 25 MiB combined before encoding and 25 MiB for the complete encoded MIME; approximately 18 MiB of files is a practical ceiling.
- Every send has a persisted request key. Double clicks and retries cannot send the same attempt again. SMTP2GO acceptance is not a claim of final delivery. Ambiguous/partial responses and all HTTP 5xx responses lock the attempt for status checking and provider reconciliation. The local MIME archive remains available for attachment recovery; do not resend blindly.
- Backend replies appear in the backend conversation. They are **not appended to QQ's Sent folder** in this version. Customer replies still reach QQ through Cloudflare and appear after the next sync.
- No AI-generated drafting or automatic customer replies are enabled.

## Local UI verification

`node scripts/preview-admin-mailbox.mjs` starts an isolated fixture UI at `http://127.0.0.1:3127`. All mail responses are local fixtures; it does not load credentials, connect to the database or send mail. Include `[unknown]` in a fixture reply to exercise delivery-unknown locking, `[denied]` for specific failure diagnostics, or `[delay]` to test switching conversations while a reply is pending. Stop this server after checking the interface.

The [SMTP2GO standard endpoint](https://developers.smtp2go.com/reference/send-standard-email) accepts custom headers and Base64 attachment bytes. This integration explicitly uses `fastaccept: false` and validates the response counters; HTTP 200 alone does not confirm acceptance. The same endpoint is used by the existing admin composer. Its permission and final recipient-side headers still require verification with an explicitly authorized real send.

## 发送失败排查与修复部署

2026-10-14 的排查发现：初版回复调用 `/email/mime`，当前本机配置的 SMTP2GO 密钥对该接口返回 `E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED`。数据库中三次失败仅保留了通用拒绝状态，不能从旧记录还原每次服务商原文。修复改用原有写信功能使用的 `/email/send`，并保留会话头和附件；无须为本次代码修复增加数据库迁移或 QQ 授权码配置。

1. 将修复代码部署到实际运行 `laifappe.com` 的应用，并按现有发布流程重新构建、重启。只修改本机文件不会更新线上后台。仍须确保服务器 SMTP2GO 密钥具有 `/email/send` 权限。
2. 新失败会显示固定、安全的原因，例如接口权限不足、认证失败或请求被拒绝。「查询失败原因」只读取已有尝试，诊断详情显示错误代码和服务商请求编号。旧版只保存通用错误的记录仍显示通用原因。
3. 原尝试为明确失败时，修复后点击「保留草稿，新建发送尝试」，重新核对收件人和附件后发送。若状态是待确认，不要新建尝试，应先查服务商记录以排除重复投递。
4. `npx tsx scripts/diagnose-mailbox-sending.ts` 只读最近十次尝试的状态和诊断编号，不输出正文或凭据。可选 `--probe-legacy-mime-permission` 向旧 MIME 接口提交不含邮件头、地址的诊断字符串，不能投递邮件；它只帮助确认旧接口的权限拒绝，不能证明标准接口已获授权或真实投递成功。

Local code, database migration, successful QQ login, imported history, production deployment and verified external delivery are separate states. Record each explicitly during rollout.
