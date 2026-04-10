# EFD Agent Instructions

Bu dosya, Factory Droid'un bu depoda çalışırken uyması gereken standart rehberdir.

## Projeye Genel Bakış

Bu depo, **Factory Droid** için hazırlanmış üretim kalitesinde bir eklenti deposudur. Şu anda 47 özel agent, 177 skill, 75 command ve bunları destekleyen hook, rule ve MCP yapılandırmaları içerir. Depo, çoklu harness uyumluluğu için değil, yeniden kullanılabilir Factory Droid iş akışları sunmak için düzenlenmiştir.

## Proje Yapısı ve Modül Organizasyonu

Ana dizinler:

- `agents/` — 47 özel alt agent
- `skills/` — 171 iş akışı skill'i ve alan bilgisi
- `commands/` — 74 slash command

Destekleyici dizinler:

- `scripts/` — çalışma zamanı ve doğrulama mantığı
- `tests/` — otomatik testler
- `hooks/`, `rules/`, `mcp-configs/` — otomasyon ve entegrasyon yapılandırmaları
- `examples/`, `assets/` — örnekler ve referans materyaller

Yeni yetenekler eklerken önce `skills/` dizinini tercih edin; yalnızca uyumluluk girişi gerekiyorsa `commands/` dizinini değiştirin.

## Build, Test ve Geliştirme Komutları

```bash
# Tam doğrulama
npm test

# Kod ve Markdown lint
npm run lint

# Kapsama doğrulaması (yalnızca çalışma zamanı kodu değiştiyse gerekli)
npm run coverage

# Yerel hızlı iterasyon
node tests/run-all.js
```

Proje Node.js 18+ gerektirir. Depo Yarn 4'e sabitlenmiştir ancak yayımlanan script'ler `npm` ile de uyumludur.

## Kodlama Stili ve İsimlendirme Kuralları

- JavaScript `.prettierrc` kurallarını izler: 2 boşluk girinti, tek tırnak, noktalı virgül, sondaki virgül yok, `printWidth` 200
- Dosyalar tek sorumluluk ilkesine yakın tutulmalı, immutable güncellemeler tercih edilmeli ve hatalar açıkça ele alınmalı
- Dosya adları küçük harf ve tire ile yazılmalı; örn. `python-reviewer.md`, `tdd-workflow.md`
- `agents/` ve `commands/` dosyaları YAML frontmatter içeren Markdown olmalıdır
- Frontmatter içindeki `name` küçük harf ve tire kullanmalı, `description` net olmalı ve yalnızca gerçekten gereken araçlar listelenmelidir

## Test Gereksinimleri

- Davranış değiştiğinde ilgili testler mutlaka eklenmeli veya güncellenmelidir
- Testler değiştirilen alana paralel dizinlerde yer almalıdır; örn. `tests/hooks/*.test.js`, `tests/lib/*.test.js`, `tests/scripts/*.test.js`
- İterasyon sırasında hedefli testler çalıştırılabilir, ancak finalde mutlaka `npm test` çalıştırılmalıdır
- Çalışma zamanı kodu değiştiyse ayrıca `npm run coverage` da çalıştırılmalıdır

## Commit ve Katkı Kuralları

- Commit mesajları commitlint kurallarına uymalıdır: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`
- Subject küçük harfli olmalı ve 100 karakteri aşmamalıdır
- Örnek: `feat(skills): add rust-patterns skill`
- PR'lerde kısa özet, değişiklik türü, test notları ve gizli veri / yerel yol eklenmediğine dair doğrulama bulunmalıdır

## Güvenlik ve Depo Kısıtları

- API key, token, yerel makine yolu veya başka hassas veriler commit edilmemelidir
- Üretilen yapılandırmalar mümkün olduğunda doğrulanmalıdır
- Depo genişletilirken `skills-first` mimarisi korunmalı, yinelenen iş akışları eklenmemelidir
