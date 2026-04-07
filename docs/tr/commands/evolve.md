---
name: evolve
description: İçgüdüleri analiz et ve evrimleşmiş yapılar öner veya oluştur
command: true
---

# Evolve Komutu

## Uygulama

Plugin root path kullanarak instinct CLI'ı çalıştır:

```bash
python3 "${FACTORY_PROJECT_DIR}/skills/continuous-learning-v2/scripts/instinct-cli.py" evolve [--generate]
```

Veya `FACTORY_PROJECT_DIR` ayarlanmamışsa (manuel kurulum):

```bash
python3 ~/.factory/skills/continuous-learning-v2/scripts/instinct-cli.py evolve [--generate]
```

İçgüdüleri analiz eder ve ilgili olanları daha üst seviye yapılara kümelendirir:
- **Commands**: İçgüdüler kullanıcı tarafından çağrılan aksiyonları tanımladığında
- **Skills**: İçgüdüler otomatik tetiklenen davranışları tanımladığında
- **Droids**: İçgüdüler karmaşık, çok adımlı süreçleri tanımladığında

## Kullanım

```
/evolve                    # Tüm içgüdüleri analiz et ve evrimleri öner
/evolve --generate         # Ayrıca evolved/{skills,commands,droids} altında dosyalar oluştur
```

## Evrim Kuralları

### → Command (Kullanıcı Tarafından Çağrılan)
İçgüdüler kullanıcının açıkça talep edeceği aksiyonları tanımladığında:
- "Kullanıcı ... istediğinde" hakkında birden fazla içgüdü
- "Yeni X oluştururken" gibi tetikleyicilere sahip içgüdüler
- Tekrarlanabilir bir sıra izleyen içgüdüler

Örnek:
- `new-table-step1`: "veritabanı tablosu eklerken, migration oluştur"
- `new-table-step2`: "veritabanı tablosu eklerken, şemayı güncelle"
- `new-table-step3`: "veritabanı tablosu eklerken, tipleri yeniden oluştur"

→ Oluşturur: **new-table** komutu

### → Skill (Otomatik Tetiklenen)
İçgüdüler otomatik olarak gerçekleşmesi gereken davranışları tanımladığında:
- Pattern-matching tetikleyiciler
- Hata işleme yanıtları
- Kod stili zorlaması

Örnek:
- `prefer-functional`: "fonksiyon yazarken, functional stil tercih et"
- `use-immutable`: "state değiştirirken, immutable pattern kullan"
- `avoid-classes`: "modül tasarlarken, class-based tasarımdan kaçın"

→ Oluşturur: `functional-patterns` skill

### → Droid (Derinlik/İzolasyon Gerektirir)
İçgüdüler izolasyondan fayda sağlayan karmaşık, çok adımlı süreçleri tanımladığında:
- Debugging iş akışları
- Refactoring dizileri
- Araştırma görevleri

Örnek:
- `debug-step1`: "debug yaparken, önce logları kontrol et"
- `debug-step2`: "debug yaparken, başarısız componenti izole et"
- `debug-step3`: "debug yaparken, minimal reproduction oluştur"
- `debug-step4`: "debug yaparken, düzeltmeyi testle doğrula"

→ Oluşturur: **debugger** droid

## Yapılacaklar

1. Mevcut proje bağlamını tespit et
2. Proje + global içgüdüleri oku (ID çakışmalarında proje önceliklidir)
3. İçgüdüleri tetikleyici/domain desenlerine göre grupla
4. Şunları tanımla:
   - Skill adayları (2+ içgüdüye sahip tetikleyici kümeleri)
   - Command adayları (yüksek güvenli workflow içgüdüleri)
   - Droid adayları (daha büyük, yüksek güvenli kümeler)
5. Uygulanabilir durumlarda terfi adaylarını göster (proje -> global)
6. `--generate` geçilirse, dosyaları şuraya yaz:
   - Proje kapsamı: `~/.factory/homunculus/projects/<project-id>/evolved/`
   - Global fallback: `~/.factory/homunculus/evolved/`

## Çıktı Formatı

```
============================================================
  EVOLVE ANALYSIS - 12 instincts
  Project: my-app (a1b2c3d4e5f6)
  Project-scoped: 8 | Global: 4
============================================================

High confidence instincts (>=80%): 5

## SKILL CANDIDATES
1. Cluster: "adding tests"
   Instincts: 3
   Avg confidence: 82%
   Domains: testing
   Scopes: project

## COMMAND CANDIDATES (2)
  /adding-tests
    From: test-first-workflow [project]
    Confidence: 84%

## DROID CANDIDATES (1)
  adding-tests-droid
    Covers 3 instincts
    Avg confidence: 82%
```

## Bayraklar

- `--generate`: Analiz çıktısına ek olarak evrimleşmiş dosyaları oluştur

## Oluşturulan Dosya Formatı

### Command
```markdown
---
name: new-table
description: Migration, şema güncellemesi ve tip oluşturma ile yeni veritabanı tablosu oluştur
command: /new-table
evolved_from:
  - new-table-migration
  - update-schema
  - regenerate-types
---

# New Table Command

[Kümelenmiş içgüdülere dayalı oluşturulan içerik]

## Steps
1. ...
2. ...
```

### Skill
```markdown
---
name: functional-patterns
description: Functional programming pattern'lerini zorla
evolved_from:
  - prefer-functional
  - use-immutable
  - avoid-classes
---

# Functional Patterns Skill

[Kümelenmiş içgüdülere dayalı oluşturulan içerik]
```

### Droid
```markdown
---
name: debugger
description: Sistematik debugging droid
model: claude-sonnet-4-6
evolved_from:
  - debug-check-logs
  - debug-isolate
  - debug-reproduce
---

# Debugger Droid

[Kümelenmiş içgüdülere dayalı oluşturulan içerik]
```
