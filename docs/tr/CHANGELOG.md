# Değişiklik Günlüğü

## 2026-04-10

### Kırıcı Değişiklikler
- **5 `multi-*` komutu kaldırıldı**: `multi-plan`, `multi-execute`, `multi-backend`, `multi-frontend`, `multi-workflow` ve tüm çevirileri (toplam 20 dosya). Bunlar harici `ccg-workflow` runtime'ına (`codeagent-wrapper` binary) bağlıydı ve yerli Factory Droid alternatifleriyle tamamen değiştirildi: `/plan`, `/orchestrate`, `/devfleet`, `/prp-plan`, `/prp-implement`.

### Değişenler
- **Dokümantasyon temizliği**: Dokümantasyon ve skill dosyalarından Cursor, Codex, OpenCode ve Antigravity referansları kaldırıldı. EFD bir Factory Droid özel projesidir.
- **`factory-droid-adapter-pattern` skill'i arşivlendi** — `docs/migration/` dizinine taşındı, tarihsel ECC→EFD geçiş referansı olarak korunuyor, artık aktif skill olarak kayıtlı değil.
- **`commands/santa-loop.md` güncellendi**: Codex CLI reviewer, Gemini CLI ile değiştirildi.
- README dosyalarından, USAGE-EXAMPLES rehberlerinden, COMMAND-AGENT-MAP ve EFD kılavuzundan ccg-workflow referansları temizlendi.
- Komut sayısı güncellendi: 79 → 74, skill sayısı: 172 → 171.

## 2026-04-07

### Bağımsız proje için ilk sürüm

- Everything Factory Droid artık bağımsız bir Factory Droid projesi olarak konumlandırıldı.
- Güncel katalog: 47 agent, 172 skill, 75 command, 89 rule dosyası ve 16 hook matcher.
- Seçici kurulum profilleri, çapraz platform installer’lar, session araçları ve proje-yerel Hook iş akışları içerir.
