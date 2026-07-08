# Telegram Webhook Runbook (local/demo)

Story `S-03.16`. How to expose the Notification service Telegram webhook from a
local or demo environment with a tunnel, run the real end-to-end alert test,
and clean up afterwards. No code changes are required in the service: Telegram
must simply be able to reach `POST /notifications/telegram/webhook` over HTTPS.

## 1. Prerequisites

- A Telegram bot created with [@BotFather](https://t.me/BotFather)
  (`/newbot`). Keep the token it prints.
- These variables set in `.env` (see `.env.example`) before starting the
  Notification service and the API:

  ```bash
  TELEGRAM_BOT_TOKEN=123456789:AA...        # from BotFather
  TELEGRAM_BOT_USERNAME=weatherflow_bot     # without the leading @
  TELEGRAM_WEBHOOK_SECRET=<random-string>   # e.g. openssl rand -hex 16
  ```

- The stack running: `docker compose up --build` (or `npm run start:api:dev` +
  `npm run start:notifications:dev` + `npm run start:web:dev`). The Notification
  service listens on `http://localhost:3001`.

## 2. Expose the webhook with a tunnel

Telegram only delivers updates to public HTTPS URLs, so tunnel port `3001`.

**ngrok:**

```bash
ngrok http 3001
# copy the https forwarding URL, e.g. https://a1b2c3.ngrok-free.app
```

**cloudflared (no account needed for quick tunnels):**

```bash
cloudflared tunnel --url http://localhost:3001
# copy the https URL, e.g. https://random-words.trycloudflare.com
```

Export it for the next steps:

```bash
export TUNNEL_URL=https://a1b2c3.ngrok-free.app
```

## 3. Register the webhook (`setWebhook`)

Register the tunnel URL with the same secret the service validates
(`TELEGRAM_WEBHOOK_SECRET`). Telegram will echo the secret back in the
`X-Telegram-Bot-Api-Secret-Token` header of every update:

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${TUNNEL_URL}/notifications/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
# {"ok":true,"result":true,"description":"Webhook was set"}
```

## 4. Verify (`getWebhookInfo`)

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Check that:

- `url` matches `${TUNNEL_URL}/notifications/telegram/webhook`.
- `last_error_message` is absent. `pending_update_count` should drop to `0`
  once the service starts answering.

If `last_error_message` shows `401 Unauthorized`, the `secret_token` you
registered does not match the `TELEGRAM_WEBHOOK_SECRET` the Notification
service loaded — the controller rejects mismatched secrets by design
(`telegram-webhook.controller.ts`).

## 5. End-to-end test

1. **Link the account.** In the web UI (`http://localhost:5174`), open
   *Perfil → Canales de entrega → Telegram* and press **Generar código de
   vinculación**. Send the shown `/link WF-XXXXXXXX` command to the bot before
   the code expires, then press **Ya envié el código — verificar**. The panel
   must switch to *Vinculado* with the chat id.
2. **Subscribe to alerts.** Make sure the user is subscribed to a station with
   the alert type you are going to trigger (*Suscripciones* page). Note that
   subscriptions target stations owned by *another* user.
3. **Trigger an alert.** As the station owner, register a measurement that
   produces an alert (e.g. temperature `42` for `EXTREME_HEAT` — the same
   presets used in the web demo script).
4. **Observe delivery.** The alert message must arrive in the linked Telegram
   chat. The pipeline is: API persists the measurement → publishes
   `ClimateAlertDetectedMessage` to RabbitMQ → Notification service consumes it
   and `TelegramAlertNotifierAdapter` calls `sendMessage` for every target with
   the `telegram` channel.

Evidence for the story (screenshots): the profile page showing the generated
code, the `/link` exchange with the bot, the linked state in the web, and the
alert message received in Telegram.

## 6. Negative check (webhook secret)

The webhook must keep rejecting requests without the correct secret:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "${TUNNEL_URL}/notifications/telegram/webhook" \
  -H "Content-Type: application/json" \
  -d '{"update_id":1}'
# 401
```

## 7. Cleanup (`deleteWebhook`)

Always remove the webhook when the demo ends — the tunnel URL is ephemeral and
Telegram would keep retrying against it:

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook" \
  -d "drop_pending_updates=true"
# {"ok":true,"result":true,"description":"Webhook was deleted"}
```

Then stop the tunnel (`Ctrl+C` on ngrok/cloudflared). Rotate
`TELEGRAM_WEBHOOK_SECRET` if the tunnel URL was shared outside the team.
