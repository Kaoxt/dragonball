# Private site mailboxes

The mailbox lives at `/mail/` (`/admin/mail/` redirects there). It reuses site
accounts. The established owner receives the existing `support@dragonballocg.com`
inbox. In **Manage inboxes**, an administrator can create another address and
assign it to an existing site username. The user then signs in at `/account/`
and opens Mailbox in their account menu.

Every mailbox API call checks the signed-in owner. Administrators can list and
create addresses but cannot read another user's messages through the UI/API.
Ownership is immutable in this version. Infrastructure operators still have
access to the underlying database and R2 storage; this is not end-to-end encryption.

## Activate receiving

1. Deploy the main site through its existing Git/Cloudflare workflow. Its
   `wrangler.jsonc` binds `MAIL_STORAGE` to the existing private bucket
   `dragonball-ocg-mail-storage`. Keep the bucket private and preserve the existing
   `UPLOADS`, `COMMUNITY` and `ROOMS` bindings.
2. The existing `dragonball-ocg-mail` Worker and the current support routing rule
   continue to work. Open the support mailbox and select **Refresh** to import
   stored `incoming/*.eml` messages. The index uses trusted R2 custom metadata
   `recipient`, `sender`, `receivedAt`, matching the receiver already deployed.
   Missing recipient metadata is never guessed from To/Cc headers.
3. To receive for additional addresses, deploy the updated standalone receiver:
   `npm run deploy:mail` (requires authorized Cloudflare access). It keeps the
   fixed-length ArrayBuffer storage fix. Alternatively, paste `src/mail-receiver.js`
   into the existing receiver's editor and deploy. Keep its `MAIL_STORAGE` binding.
4. In Cloudflare Email Routing, either add a rule for each new address pointing
   to `dragonball-ocg-mail`, or enable a catch-all pointing to that Worker. The
   updated Worker rejects recipients unless their address was provisioned by the
   site's mailbox manager. The existing support address is explicitly retained.
   Do not change unrelated existing routes.

Creating an inbox registers its allowed address in the private bucket. A failed
registration can be repaired by opening that inbox and pressing Refresh. Creating
an inbox alone cannot change Cloudflare routing; without an address rule or the
catch-all, that address cannot receive mail. The current implementation imports
mail on opening/Refresh, in bounded pages; it does not use background polling.
Very large existing stores may require multiple Refresh operations.

## Activate sending

Receiving and sending are separate. Sending is deliberately disabled until
Cloudflare Email Sending is onboarded and verified for `dragonballocg.com`.

1. In Cloudflare **Email Service → Email Sending**, onboard the domain and verify
   the requested sending DNS records. Preserve existing receiving MX records.
2. Add this binding to the **main site** Worker configuration (not the receiver):

   ```json
   "send_email": [{ "name": "MAIL_OUTBOUND" }]
   ```

3. Set `MAIL_SEND_ENABLED` to the text value `true` on the main site Worker. If
   variables are managed in Wrangler, retain the value there across deployments.
4. Redeploy and verify the sending account is permitted to send to external
   recipients. The UI enables Compose/Reply only when both the binding and flag
   are present. That readiness signal is configuration, not proof of delivery.
5. From your own inbox, send an explicit test to an address you control and check
   Cloudflare's delivery log. No real messages are sent by the automated tests.

Sending uses Cloudflare's structured `send()` API and fixes the From address to
the owned mailbox. One recipient and plain text are supported. Sent messages
are retained. An uncertain provider result is never automatically retried;
check the delivery logs before composing another copy. Account sending is capped
at 20 attempts per hour by the application.

## Spam and message safety

- Cloudflare applies SMTP authentication/reputation checks before receipt.
- Per-inbox blocked senders, conservative content rules, suspicious local-domain
  impersonation and executable attachment names quarantine messages in Spam.
  These are basic heuristics, not a trained spam classifier or antivirus service.
- Sender-supplied `Authentication-Results` or `X-Spam-*` headers are not trusted.
- Messages are rendered as text. Email HTML, scripts, external images and tracking
  pixels never execute or load in the mailbox. Attachments are download-only.
- Messages larger than 10 MiB or not safely parseable remain downloadable in Spam.
  The receiver accepts at most 25 MiB per message.
- Spam, Archive and Trash are recoverable. This release does not automatically
  purge messages or permanently delete mail. Monitor R2 storage as mail accumulates.
- Inbox creation cannot reveal mail that predates that inbox. The initial support
  mailbox alone imports its existing historical messages.

## Verification

`node --test tests/mail.test.js` covers account isolation (including administrators),
forged To headers/Bcc routing, legacy MIME import, safe attachment downloads,
spam restoration, per-inbox blocking, new address ownership, folder isolation,
provider failures, send deduplication and paginated ingestion.

Official Cloudflare references:

- https://developers.cloudflare.com/email-service/concepts/email-lifecycle/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/email-service/get-started/send-emails/
