# Factory X-Ray

Türkiye geneli endüstriyel tesis, OSB, OEM, yatırım sinyali ve satış fırsatı radarı.

## Mimari

- **Supabase:** ana veri modeli, cron, web tarama kuyruğu ve güvenli dashboard JSON API
- **Tavily:** web keşfi
- **Firecrawl:** sayfa scraping / içerik çıkarımı
- **Cloudflare:** hedef production hosting
- **GitHub Pages:** geçici statik hosting / smoke test

## Dashboard

Statik UI `public/` dizinindedir. Hiçbir API anahtarı veya parola repoda tutulmaz.
Dashboard verisi Basic Auth korumalı Supabase Edge Function üzerinden alınır.

API endpoint:

`https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api`

## Cloudflare deploy

Repo Cloudflare'a bağlandığında:

- Build command: `npm install && npm run deploy` (Workers Builds) veya statik Pages için build komutu boş
- Static output: `public`
- `wrangler.jsonc` statik asset deployment için hazırdır.

## Güvenlik

Bu repo public olsa bile hiçbir secret içermez. Tavily ve Firecrawl anahtarları Supabase Vault/runtime tarafında saklanır.
