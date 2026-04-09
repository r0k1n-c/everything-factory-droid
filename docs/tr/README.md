# Everything Factory Droid

[![Stars](https://img.shields.io/github/stars/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/stargazers)
[![Forks](https://img.shields.io/github/forks/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/network/members)
[![Contributors](https://img.shields.io/github/contributors/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/graphs/contributors)
[![npm efd-install](https://img.shields.io/npm/dw/%40r0k1n-c%2Fefd-install?label=efd-install%20haftalık%20indirme&logo=npm)](https://www.npmjs.com/package/@r0k1n-c/efd-install)
[![npm efd-agentshield](https://img.shields.io/npm/dw/efd-agentshield?label=efd-agentshield%20haftalık%20indirme&logo=npm)](https://www.npmjs.com/package/efd-agentshield)
[![GitHub App Install](https://img.shields.io/badge/GitHub%20App-150%20kurulum-2ea44f?logo=github)](https://github.com/marketplace/efd-tools)
[![License](https://img.shields.io/badge/lisans-MIT-blue.svg)](../../LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white)
![Go](https://img.shields.io/badge/-Go-00ADD8?logo=go&logoColor=white)
![Java](https://img.shields.io/badge/-Java-ED8B00?logo=openjdk&logoColor=white)
![Perl](https://img.shields.io/badge/-Perl-39457E?logo=perl&logoColor=white)
![Markdown](https://img.shields.io/badge/-Markdown-000000?logo=markdown&logoColor=white)

> **Factory Droid odaklı** | **47 agent** | **171 skill** | **79 command** | **Çapraz platform installer'lar**

---

<div align="center">

**Dil / Language / 语言 / 語言**

[**English**](../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja-JP/README.md) | [한국어](../ko-KR/README.md) | [Português (BR)](../pt-BR/README.md) | [**Türkçe**](README.md)

</div>

---

**Modern mühendislik ekipleri için eksiksiz bir Factory Droid iş akışı sistemi.**

Factory Droid için planlama, uygulama, inceleme, güvenlik, araştırma ve operasyon akışlarını bir araya getiren agent, skill, hook, rule, MCP konfigürasyonu, installer ve command shim koleksiyonu.

Bu proje artık yalnızca **Factory Droid** için tutuluyor.

---

## Rehberler

Bu repository yalnızca ham kodu içerir. Rehberler her şeyi açıklıyor.

<table>
<tr>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2012378465664745795">
<img src="../../assets/images/guides/shorthand-guide.png" alt="Everything Factory Droid Kısa Rehberi" />
</a>
</td>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2014040193557471352">
<img src="../../assets/images/guides/longform-guide.png" alt="Everything Factory Droid Uzun Rehberi" />
</a>
</td>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2033263813387223421">
<img src="../../assets/images/security/security-guide-header.png" alt="Agentic Güvenlik Kısa Rehberi" />
</a>
</td>
</tr>
<tr>
<td align="center"><b>Kısa Rehber</b><br/>Kurulum, temeller, felsefe. <b>İlk önce bunu okuyun.</b></td>
<td align="center"><b>Uzun Rehber</b><br/>Token optimizasyonu, memory kalıcılığı, eval'ler, paralelleştirme.</td>
<td align="center"><b>Güvenlik Rehberi</b><br/>Saldırı vektörleri, sandboxing, sanitizasyon, CVE'ler, AgentShield.</td>
</tr>
</table>

| Konu | Öğrenecekleriniz |
|------|------------------|
| Token Optimizasyonu | Model seçimi, system prompt daraltma, background process'ler |
| Memory Kalıcılığı | Oturumlar arası bağlamı otomatik kaydet/yükle hook'ları |
| Sürekli Öğrenme | Oturumlardan otomatik pattern çıkarma ve yeniden kullanılabilir skill'lere dönüştürme |
| Verification Loop'ları | Checkpoint vs sürekli eval'ler, grader tipleri, pass@k metrikleri |
| Paralelleştirme | Git worktree'ler, cascade metodu, instance'ları ne zaman ölçeklendirmeli |
| Subagent Orkestrasyonu | Context problemi, iterative retrieval pattern |

---

## Hızlı Başlangıç

2 dakikadan kısa sürede başlayın:

### Adım 1: Plugin'i Kurun

```bash
# Marketplace ekle
droid plugin marketplace add https://github.com/r0k1n-c/everything-factory-droid

# Plugin'i kur
droid plugin install everything-factory-droid@everything-factory-droid
```

### Adım 2: Rule'ları Kurun (Gerekli)

> WARNING: **Önemli:** Factory Droid plugin'leri `rule`'ları otomatik olarak dağıtamaz. Manuel olarak kurmalısınız:

```bash
# Kurulumu HEDEF PROJE kök dizininden çalıştırın
cd /projenizin/yolu

# Önerilen: repo klonlamadan
npx @r0k1n-c/efd-install --profile full

# Veya yalnızca ihtiyacınız olanları kurun
npx @r0k1n-c/efd-install typescript    # veya python veya golang veya swift veya php
# npx @r0k1n-c/efd-install typescript python golang swift php
# npx @r0k1n-c/efd-install --profile developer
# npx @r0k1n-c/efd-install --with lang:typescript --with capability:security
```

```powershell
# Windows PowerShell — yine HEDEF PROJE kök dizininde
Set-Location C:\projenizin\yolu
npx @r0k1n-c/efd-install --profile full
# npx @r0k1n-c/efd-install typescript
# npx @r0k1n-c/efd-install --profile developer
# npx @r0k1n-c/efd-install --with lang:typescript --with capability:security
```

```bash
# Alternatif: bu repo'yu herhangi bir yere klonlayın, ama installer'ı yine
# HEDEF PROJE kök dizininden çalıştırın (clone içinde veya ~/.factory/plugins/... altında değil)
git clone https://github.com/r0k1n-c/everything-factory-droid.git ~/everything-factory-droid
cd /projenizin/yolu
bash ~/everything-factory-droid/install.sh typescript
# bash ~/everything-factory-droid/install.sh --profile full
```

`install.sh` komutunu `~/.factory/plugins/...` içinde veya klonlanmış repo içinde çalıştırmayın; yalnızca gerçekten yapılandırmak istediğiniz proje dizininde çalıştırın.

Manuel kopyalama kurulum talimatları için `rules/` klasöründeki README'ye bakın.

### Adım 3: Kullanmaya Başlayın

```bash
# Bir command deneyin (plugin kurulumu namespace'li form kullanır)
/everything-factory-droid:plan "Kullanıcı kimlik doğrulaması ekle"

# Manuel kurulum (Seçenek 2) daha kısa formu kullanır:
# /plan "Kullanıcı kimlik doğrulaması ekle"

# Plugin kurulumunu doğrulayın
droid plugin list
```

**Bu kadar!** Artık 47 agent, 171 skill ve 79 command'a erişiminiz var.

---

## Factory Droid Odağı

Bu proje yalnızca **Factory Droid** uyumlu yüzeyi korur:

- `./install.sh`, `npx efd` ve `npx @r0k1n-c/efd-install` Factory Droid hedefini çözer.
- Proje içi kurulumlar `.factory/` altına yazılır.
- Paketlenen içerik Factory Droid droid/skill/command varlıkları ve `settings.json` ile sınırlıdır.
- Cursor/Codex/OpenCode/Antigravity kurulum dökümanları bu projeden bilerek çıkarıldı.

## İçindekiler

Bu repo bir **Factory Droid plugin'i** - doğrudan kurun veya component'leri manuel olarak kopyalayın.

```
everything-factory-droid/
|-- .factory/         # Repo-yerel Factory Droid proje yapılandırması
|   |-- settings.json       # Bu repo için proje ayarları
|   |-- package-manager.json # Repo çalışmaları için tercih edilen paket yöneticisi
|   |-- identity.json       # Proje kimlik metadatası
|   |-- rules/              # Repo-yerel Droid guardrail'leri
|
|-- agents/           # Delegation için 47 özel subagent
|   |-- planner.md           # Feature implementasyon planlama
|   |-- architect.md         # Sistem tasarım kararları
|   |-- tdd-guide.md         # Test-driven development
|   |-- code-reviewer.md     # Kalite ve güvenlik incelemesi
|   |-- security-reviewer.md # Güvenlik açığı analizi
|   |-- build-error-resolver.md
|   |-- e2e-runner.md        # Playwright E2E testing
|   |-- refactor-cleaner.md  # Ölü kod temizleme
|   |-- doc-updater.md       # Dokümantasyon senkronizasyonu
|   |-- docs-lookup.md       # Dokümantasyon/API arama
|   |-- chief-of-staff.md    # İletişim triajı ve taslaklar
|   |-- loop-operator.md     # Otonom loop çalıştırma
|   |-- harness-optimizer.md # Harness config ayarlama
|   |-- ve daha fazlası...
|
|-- skills/           # İş akışı tanımları ve domain bilgisi
|   |-- coding-standards/           # Dil en iyi uygulamaları
|   |-- backend-patterns/           # API, veritabanı, caching pattern'leri
|   |-- frontend-patterns/          # React, Next.js pattern'leri
|   |-- security-review/            # Güvenlik kontrol listesi
|   |-- tdd-workflow/               # TDD metodolojisi
|   |-- continuous-learning/        # Oturumlardan otomatik pattern çıkarma
|   |-- django-patterns/            # Django pattern'leri
|   |-- golang-patterns/            # Go deyimleri ve en iyi uygulamalar
|   |-- ve 100+ daha fazla skill...
|
|-- commands/         # Hızlı çalıştırma için slash command'lar
|   |-- tdd.md              # /tdd - Test-driven development
|   |-- plan.md             # /plan - Implementasyon planlama
|   |-- e2e.md              # /e2e - E2E test oluşturma
|   |-- code-review.md      # /code-review - Kalite incelemesi
|   |-- build-fix.md        # /build-fix - Build hatalarını düzelt
|   |-- ve 50+ daha fazla command...
|
|-- rules/            # Her zaman uyulması gereken kurallar (~/.factory/rules/ içine kopyalayın)
|   |-- README.md            # Yapı genel bakışı ve kurulum rehberi
|   |-- common/              # Dilden bağımsız prensipler
|   |   |-- coding-style.md    # Immutability, dosya organizasyonu
|   |   |-- git-workflow.md    # Commit formatı, PR süreci
|   |   |-- testing.md         # TDD, %80 coverage gereksinimi
|   |   |-- performance.md     # Model seçimi, context yönetimi
|   |   |-- patterns.md        # Tasarım pattern'leri
|   |   |-- hooks.md           # Hook mimarisi
|   |   |-- agents.md          # Ne zaman subagent'lara delege edilmeli
|   |   |-- security.md        # Zorunlu güvenlik kontrolleri
|   |-- typescript/          # TypeScript/JavaScript özel
|   |-- python/              # Python özel
|   |-- golang/              # Go özel
|   |-- swift/               # Swift özel
|   |-- php/                 # PHP özel
|
|-- hooks/            # Trigger-tabanlı otomasyonlar
|   |-- hooks.json                # Tüm hook'ların config'i
|   |-- memory-persistence/       # Session lifecycle hook'ları
|   |-- strategic-compact/        # Compaction önerileri
|
|-- scripts/          # Çapraz platform Node.js script'leri
|   |-- lib/                     # Paylaşılan yardımcılar
|   |-- hooks/                   # Hook implementasyonları
|   |-- setup-package-manager.js # Interaktif PM kurulumu
|
|-- mcp-configs/      # MCP server konfigürasyonları
|   |-- mcp-servers.json    # GitHub, Supabase, Vercel, Railway, vb.
```

---

## Hangi Agent'ı Kullanmalıyım?

Nereden başlayacağınızdan emin değil misiniz? Bu hızlı referansı kullanın:

| Yapmak istediğim... | Bu command'ı kullan | Kullanılan agent |
|---------------------|---------------------|------------------|
| Yeni bir feature planla | `/everything-factory-droid:plan "Auth ekle"` | planner |
| Sistem mimarisi tasarla | `/everything-factory-droid:plan` + architect agent | architect |
| Önce testlerle kod yaz | `/tdd` | tdd-guide |
| Yazdığım kodu incele | `/code-review` | code-reviewer |
| Başarısız bir build'i düzelt | `/build-fix` | build-error-resolver |
| End-to-end testler çalıştır | `/e2e` | e2e-runner |
| Güvenlik açıklarını bul | `/security-scan` | security-reviewer |
| Ölü kodu kaldır | `/refactor-clean` | refactor-cleaner |
| Dokümantasyonu güncelle | `/update-docs` | doc-updater |
| Go kodu incele | `/go-review` | go-reviewer |
| Python kodu incele | `/python-review` | python-reviewer |

### Yaygın İş Akışları

**Yeni bir feature başlatma:**
```
/everything-factory-droid:plan "OAuth ile kullanıcı kimlik doğrulaması ekle"
                                              → planner implementasyon planı oluşturur
/tdd                                          → tdd-guide önce-test-yaz'ı zorunlu kılar
/code-review                                  → code-reviewer çalışmanızı kontrol eder
```

**Bir hatayı düzeltme:**
```
/tdd                                          → tdd-guide: hatayı yeniden üreten başarısız bir test yaz
                                              → düzeltmeyi uygula, testin geçtiğini doğrula
/code-review                                  → code-reviewer: regresyonları yakala
```

**Production'a hazırlanma:**
```
/security-scan                                → security-reviewer: OWASP Top 10 denetimi
/e2e                                          → e2e-runner: kritik kullanıcı akışı testleri
/test-coverage                                → %80+ coverage doğrula
```

---

## SSS

<details>
<summary><b>Hangi agent/command'ların kurulu olduğunu nasıl kontrol ederim?</b></summary>

```bash
droid plugin list
```

Bu, plugin'den mevcut tüm agent'ları, command'ları ve skill'leri gösterir.
</details>

<details>
<summary><b>Hook'larım çalışmıyor / "Duplicate hooks file" hatası alıyorum</b></summary>

Bu en yaygın sorundur. `hooks/hooks.json` dışına **tekrarlı hook tanımı EKLEMEYİN**. Factory Droid v2.1+ `hooks/hooks.json`'ı otomatik yükler; aynı hook'ları tekrar tanımlamak duplicate algılama hatalarına neden olur. Bkz. [#29](https://github.com/r0k1n-c/everything-factory-droid/issues/29), [#52](https://github.com/r0k1n-c/everything-factory-droid/issues/52), [#103](https://github.com/r0k1n-c/everything-factory-droid/issues/103).
</details>

<details>
<summary><b>Context window'um küçülüyor / Droid context'ten tükeniyor</b></summary>

Çok fazla MCP server context'inizi tüketiyor. Her MCP tool açıklaması 200k window'unuzdan token tüketir, potansiyel olarak ~70k'ya düşürür.

**Düzeltme:** Kullanılmayan MCP'leri proje başına devre dışı bırakın:
```json
// Projenizin .factory/settings.json dosyasında
{
  "disabledMcpServers": ["supabase", "railway", "vercel"]
}
```

10'dan az MCP etkin ve 80'den az aktif tool tutun.
</details>

<details>
<summary><b>Sadece bazı component'leri kullanabilir miyim (örn. sadece agent'lar)?</b></summary>

Evet. Seçenek 2'yi (manuel kurulum) kullanın ve yalnızca ihtiyacınız olanı kopyalayın:

```bash
# Sadece agent'lar
cp everything-factory-droid/agents/*.md ~/.factory/droids/

# Sadece rule'lar
cp -r everything-factory-droid/rules/common ~/.factory/rules/
```

Her component tamamen bağımsızdır.
</details>

<details>
<summary><b>Bu proje başka harness'leri destekliyor mu?</b></summary>

Hayır. Bu proje bilerek **yalnızca Factory Droid** hedefi için tutuluyor.
</details>

<details>
<summary><b>Yeni bir skill veya agent'a nasıl katkıda bulunurum?</b></summary>

[CONTRIBUTING.md](../../CONTRIBUTING.md)'ye bakın. Kısa versiyon:
1. Repo'yu fork'layın
2. `skills/your-skill-name/SKILL.md` içinde skill'inizi oluşturun (YAML frontmatter ile)
3. Veya `agents/your-agent.md` içinde bir agent oluşturun
4. Ne yaptığını ve ne zaman kullanılacağını açıklayan net bir açıklamayla PR gönderin
</details>

---

## Testleri Çalıştırma

Plugin kapsamlı bir test suite içerir:

```bash
# Tüm testleri çalıştır
node tests/run-all.js

# Bireysel test dosyalarını çalıştır
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

---

## Katkıda Bulunma

**Katkılar beklenir ve teşvik edilir.**

Bu repo bir topluluk kaynağı olmayı amaçlar. Eğer şunlara sahipseniz:
- Yararlı agent'lar veya skill'ler
- Akıllı hook'lar
- Daha iyi MCP konfigürasyonları
- İyileştirilmiş rule'lar

Lütfen katkıda bulunun! Rehber için [CONTRIBUTING.md](../../CONTRIBUTING.md)'ye bakın.

### Katkı Fikirleri

- Daha fazla dikey iş akışı ve özel agent
- Takım düzeyinde hook, rule ve kalite kapıları
- Kurulum profilleri, örnekler ve onboarding varlıkları
- Yeni stack'ler için doğrulama ve test iş akışları
- Araştırma, operasyon ve iç araç kalıpları

---

## Lisans

MIT - Özgürce kullanın, ihtiyaç duyduğunuz gibi değiştirin, yapabiliyorsanız geri katkıda bulunun.

---

**Bu repo size yardımcı olduysa yıldızlayın. Her iki rehberi de okuyun. Harika bir şey yapın.**
