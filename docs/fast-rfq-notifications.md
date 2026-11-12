# Fast RFQ capture and notification operations

Fast RFQ success means the customer's request has been saved in PostgreSQL. Email notification is a separate operation. The existing product quote-list workflow is unchanged.

## Storage and delivery

Each new request occupies its own private `Setting` row under `quote_email_request.<UUID>`. It is not added to the capped 200-entry legacy history array. ADMIN **Quote Emails** shows both old and new entries and the new notification state. No database migration is required.

The browser keeps a submission UUID across failed/uncertain responses for the same payload. Repeating that submission reuses the saved record; changed content with the same UUID is rejected. The browser issues a new ID for edited content or after acknowledgement.

After persistence, Next's `after()` makes one initial notification attempt. Delivery has a 20-second provider deadline and a five-minute database lease. A failure stays saved with a visible failed status and a safe error code. There is no scheduled retry or background batch worker. Customer replays do not resend a notification after it has already been attempted.

Concurrent initial/manual attempts use database claims and ownership checks. A successful provider response confirms acceptance, not final inbox delivery. A crash after provider acceptance before checkpoint can leave the record marked in progress; inspect the mailbox before manually retrying because the notification may already have been accepted. The stable inquiry ID identifies the same original request.

## Checking saved inquiries

- Open ADMIN **Quote Emails** to inspect saved customer content and notification status. Reload the page to see the latest status; viewing the page does not send notifications.
- **Notification not sent** means the inquiry is saved but no initial attempt has completed. This can happen if post-response execution was interrupted.
- **Notification failed; inquiry saved** means the mail attempt failed. The inquiry remains available for direct follow-up; mail is not retried automatically.
- **Notification in progress** means a notification was claimed. A live five-minute lease prevents another send. After that lease expires, refreshing makes the ADMIN manual retry available.
- **Provider accepted** means the mail provider accepted the notification. It does not prove inbox delivery.
- **Retry notification** is optional and ADMIN-only. It sends the saved request notification without creating another inquiry; already accepted notifications cannot be resent through this action.

## Deployment

Deploy, build and restart through the existing release process. Retain the existing `DATABASE_URL`, `SMTP2GO_API_KEY`, optional `SMTP2GO_DEFAULT_SENDER`, and optional `QUOTE_EMAIL_TO` in the protected deployment environment. No database migration, added worker dependency, BaoTa task, cron job or Docker scheduled command is needed. Missing mail configuration affects the notification status, not durable capture.

## Safe verification

```sh
npm run test:quote-email
```

Tests isolate storage, Next lifecycle and SMTP2GO; they do not load `.env` or send real mail. They verify durable capture, single initial delivery, no time-based/replay retry after failure, manual recovery of expired leases, legacy history pagination and ADMIN-only notification retry.
