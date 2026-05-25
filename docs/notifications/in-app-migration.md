# In-App Delivery Channel Migration

Story `S-02.10` adds `deliveryChannels.inApp` to notification profiles. New profiles default it to `true`; existing profiles can be backfilled with the idempotent script below.

```powershell
$env:MONGODB_URI = "mongodb://localhost:27017/weatherflow"
npx ts-node scripts/migrations/2026-05-add-in-app-channel.ts
```

The script only updates profiles where `deliveryChannels.inApp` is missing, so it is safe to run more than once.
