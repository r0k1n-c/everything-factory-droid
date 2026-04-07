# Sorun Giderme Rehberi

Everything Factory Droid (EFD) eklentisi için yaygın sorunlar ve çözümler.

## İçindekiler

- [Bellek ve Context Sorunları](#bellek-ve-context-sorunları)
- [Ajan Harness Hataları](#ajan-harness-hataları)
- [Hook ve İş Akışı Hataları](#hook-ve-is-akisi-hatalari)
- [Kurulum ve Yapılandırma](#kurulum-ve-yapılandırma)
- [Performans Sorunları](#performans-sorunları)
- [Yaygın Hata Mesajları](#yaygın-hata-mesajları)
- [Yardım Alma](#yardım-alma)

---

## Bellek ve Context Sorunları

### Context Window Taşması

**Belirti:** "Context too long" hataları veya eksik yanıtlar

**Nedenler:**
- Token limitlerini aşan büyük dosya yüklemeleri
- Birikmiş konuşma geçmişi
- Tek oturumda birden fazla büyük araç çıktısı

**Çözümler:**
```bash
# 1. Konuşma geçmişini temizle ve yeni başla
# Factory Droid kullan: "New Chat" veya Cmd/Ctrl+Shift+N

# 2. Analiz öncesi dosya boyutunu küçült
head -n 100 large-file.log > sample.log

# 3. Büyük çıktılar için streaming kullan
head -n 50 large-file.txt

# 4. Görevleri daha küçük parçalara böl
# Bunun yerine: "50 dosyanın hepsini analiz et"
# Kullan: "src/components/ dizinindeki dosyaları analiz et"
```

### Bellek Kalıcılığı Hataları

**Belirti:** Ajan önceki context veya gözlemleri hatırlamıyor

**Nedenler:**
- Devre dışı bırakılmış sürekli öğrenme hook'ları
- Bozuk gözlem dosyaları
- Proje algılama hataları

**Çözümler:**
```bash
# Gözlemlerin kaydedilip kaydedilmediğini kontrol et
ls ~/.factory/homunculus/projects/*/observations.jsonl

# Mevcut projenin hash id'sini bul
python3 - <<'PY'
import json, os
registry_path = os.path.expanduser("~/.factory/homunculus/projects.json")
with open(registry_path) as f:
    registry = json.load(f)
for project_id, meta in registry.items():
    if meta.get("root") == os.getcwd():
        print(project_id)
        break
else:
    raise SystemExit("Project hash not found in ~/.factory/homunculus/projects.json")
PY

# O proje için son gözlemleri görüntüle
tail -20 ~/.factory/homunculus/projects/<project-hash>/observations.jsonl

# Bozuk bir observations dosyasını yeniden oluşturmadan önce yedekle
mv ~/.factory/homunculus/projects/<project-hash>/observations.jsonl \
  ~/.factory/homunculus/projects/<project-hash>/observations.jsonl.bak.$(date +%Y%m%d-%H%M%S)

# Hook'ların etkin olduğunu doğrula
grep -r "observe" ~/.factory/settings.json
```

---

## Ajan Harness Hataları

### Ajan Bulunamadı

**Belirti:** "Agent not loaded" veya "Unknown agent" hataları

**Nedenler:**
- Eklenti doğru kurulmadı
- Ajan yolu yanlış yapılandırılmış
- Marketplace vs manuel kurulum uyumsuzluğu

**Çözümler:**
```bash
# Eklenti kurulumunu kontrol et
ls ~/.factory/plugins/cache/

# Ajanın var olduğunu doğrula (marketplace kurulumu)
ls ~/.factory/plugins/cache/*/agents/

# Manuel kurulum için ajanlar şurada olmalı:
ls ~/.factory/droids/  # Sadece özel ajanlar

# Eklentiyi yeniden yükle
# Factory Droid → Settings → Extensions → Reload
```

### İş Akışı Yürütmesi Takılıyor

**Belirti:** Ajan başlıyor ama hiç tamamlanmıyor

**Nedenler:**
- Ajan mantığında sonsuz döngüler
- Kullanıcı girdisinde takılı
- API'yi beklerken ağ zaman aşımı

**Çözümler:**
```bash
# 1. Takılı işlemleri kontrol et
ps aux | grep droid

# 2. Debug modunu etkinleştir
export CLAUDE_DEBUG=1

# 3. Daha kısa zaman aşımları ayarla
export CLAUDE_TIMEOUT=30

# 4. Ağ bağlantısını kontrol et
curl -I https://api.anthropic.com
```

### Araç Kullanım Hataları

**Belirti:** "Tool execution failed" veya izin reddedildi

**Nedenler:**
- Eksik bağımlılıklar (npm, python, vb.)
- Yetersiz dosya izinleri
- Yol bulunamadı

**Çözümler:**
```bash
# Gerekli araçların kurulu olduğunu doğrula
which node python3 npm git

# Hook scriptlerinin izinlerini düzelt
chmod +x ~/.factory/plugins/cache/*/hooks/*.sh
chmod +x ~/.factory/plugins/cache/*/skills/*/hooks/*.sh

# PATH'in gerekli binary'leri içerdiğini kontrol et
echo $PATH
```

---

<a id="hook-ve-is-akisi-hatalari"></a>

## Hook ve İş Akışı Hataları

### Hook'lar Çalışmıyor

**Belirti:** Pre/post hook'lar çalışmıyor

**Nedenler:**
- Hook'lar settings.json'da kayıtlı değil
- Geçersiz hook sözdizimi
- Hook scripti çalıştırılabilir değil

**Çözümler:**
```bash
# Hook'ların kayıtlı olduğunu kontrol et
grep -A 10 '"hooks"' ~/.factory/settings.json

# Hook dosyalarının var olduğunu ve çalıştırılabilir olduğunu doğrula
ls -la ~/.factory/plugins/cache/*/hooks/

# Hook'u manuel olarak test et
bash ~/.factory/plugins/cache/*/hooks/pre-bash.sh <<< '{"command":"echo test"}'

# Hook'ları yeniden kaydet (eklenti kullanıyorsa)
# Factory Droid ayarlarında eklentiyi devre dışı bırak ve yeniden etkinleştir
```

### Python/Node Sürüm Uyumsuzlukları

**Belirti:** "python3 not found" veya "node: command not found"

**Nedenler:**
- Python/Node kurulumu eksik
- PATH yapılandırılmamış
- Yanlış Python sürümü (Windows)

**Çözümler:**
```bash
# Python 3'ü kur (eksikse)
# macOS: brew install python3
# Ubuntu: sudo apt install python3
# Windows: python.org'dan indir

# Node.js'i kur (eksikse)
# macOS: brew install node
# Ubuntu: sudo apt install nodejs npm
# Windows: nodejs.org'dan indir

# Kurulumları doğrula
python3 --version
node --version
npm --version

# Windows: python'un (python3 değil) çalıştığından emin ol
python --version
```

### Dev Server Blocker Yanlış Pozitifleri

**Belirti:** Hook, "dev" içeren meşru komutları engelliyor

**Nedenler:**
- Heredoc içeriği pattern eşleşmesini tetikliyor
- Argümanlarda "dev" olan dev olmayan komutlar

**Çözümler:**
```bash
# Bu sorun güncel sürümlerde düzeltildi (PR #371)
# Eklentiyi en son sürüme yükselt

# Geçici çözüm: Dev sunucularını tmux'ta sarmalayın
tmux new-session -d -s dev "npm run dev"
tmux attach -t dev

# Gerekirse hook'u geçici olarak devre dışı bırak
# ~/.factory/settings.json'u düzenle ve pre-bash hook'unu kaldır
```

---

## Kurulum ve Yapılandırma

### Eklenti Yüklenmiyor

**Belirti:** Kurulumdan sonra eklenti özellikleri kullanılamıyor

**Nedenler:**
- Marketplace önbelleği güncellenmedi
- Factory Droid sürüm uyumsuzluğu
- Bozuk eklenti dosyaları

**Çözümler:**
```bash
# Değiştirmeden önce eklenti önbelleğini incele
ls -la ~/.factory/plugins/cache/

# Silmek yerine eklenti önbelleğini yedekle
mv ~/.factory/plugins/cache ~/.factory/plugins/cache.backup.$(date +%Y%m%d-%H%M%S)
mkdir -p ~/.factory/plugins/cache

# Marketplace'ten yeniden kur
# Factory Droid → Extensions → Everything Factory Droid → Uninstall
# Ardından marketplace'ten yeniden kur

# Factory Droid sürümünü kontrol et
droid --version
# Factory Droid 2.0+ gerektirir

# Manuel kurulum (marketplace başarısız olursa)
git clone https://github.com/affaan-m/everything-factory-droid.git
cp -r everything-factory-droid ~/.factory/plugins/efd
```

### Paket Yöneticisi Algılama Başarısız

**Belirti:** Yanlış paket yöneticisi kullanılıyor (pnpm yerine npm)

**Nedenler:**
- Lock dosyası mevcut değil
- FACTORY_DROID_PACKAGE_MANAGER ayarlanmamış
- Birden fazla lock dosyası algılamayı karıştırıyor

**Çözümler:**
```bash
# Tercih edilen paket yöneticisini global olarak ayarla
export FACTORY_DROID_PACKAGE_MANAGER=pnpm
# ~/.bashrc veya ~/.zshrc'ye ekle

# Veya proje bazında ayarla
echo '{"packageManager": "pnpm"}' > .factory/package-manager.json

# Veya package.json alanını kullan
npm pkg set packageManager="pnpm@8.15.0"

# Uyarı: lock dosyalarını kaldırmak kurulu bağımlılık sürümlerini değiştirebilir.
# Önce lock dosyasını commit et veya yedekle, ardından yeni bir kurulum yap ve CI'ı yeniden çalıştır.
# Bunu sadece kasıtlı olarak paket yöneticilerini değiştirirken yap.
rm package-lock.json  # pnpm/yarn/bun kullanıyorsan
```

---

## Performans Sorunları

### Yavaş Yanıt Süreleri

**Belirti:** Ajan yanıt vermek için 30+ saniye sürüyor

**Nedenler:**
- Büyük gözlem dosyaları
- Çok fazla aktif hook
- API'ye ağ gecikmesi

**Çözümler:**
```bash
# Büyük gözlemleri silmek yerine arşivle
archive_dir="$HOME/.factory/homunculus/archive/$(date +%Y%m%d)"
mkdir -p "$archive_dir"
find ~/.factory/homunculus/projects -name "observations.jsonl" -size +10M -exec sh -c '
  for file do
    base=$(basename "$(dirname "$file")")
    gzip -c "$file" > "'"$archive_dir"'/${base}-observations.jsonl.gz"
    : > "$file"
  done
' sh {} +

# Kullanılmayan hook'ları geçici olarak devre dışı bırak
# ~/.factory/settings.json'u düzenle

# Aktif gözlem dosyalarını küçük tut
# Büyük arşivler ~/.factory/homunculus/archive/ altında olmalı
```

### Yüksek CPU Kullanımı

**Belirti:** Factory Droid %100 CPU tüketiyor

**Nedenler:**
- Sonsuz gözlem döngüleri
- Büyük dizinlerde dosya izleme
- Hook'larda bellek sızıntıları

**Çözümler:**
```bash
# Kontrolden çıkmış işlemleri kontrol et
top -o cpu | grep droid

# Sürekli öğrenmeyi geçici olarak devre dışı bırak
touch ~/.factory/homunculus/disabled

# Factory Droid'u yeniden başlat
# Cmd/Ctrl+Q ardından yeniden aç

# Gözlem dosyası boyutunu kontrol et
du -sh ~/.factory/homunculus/*/
```

---

## Yaygın Hata Mesajları

### "EACCES: permission denied"

```bash
# Hook izinlerini düzelt
find ~/.factory/plugins -name "*.sh" -exec chmod +x {} \;

# Gözlem dizini izinlerini düzelt
chmod -R u+rwX,go+rX ~/.factory/homunculus
```

### "MODULE_NOT_FOUND"

```bash
# Eklenti bağımlılıklarını kur
cd ~/.factory/plugins/cache/everything-factory-droid
npm install

# Veya manuel kurulum için
cd ~/.factory/plugins/efd
npm install
```

### "spawn UNKNOWN"

```bash
# Windows'a özgü: Scriptlerin doğru satır sonlarını kullandığından emin ol
# CRLF'yi LF'ye dönüştür
find ~/.factory/plugins -name "*.sh" -exec dos2unix {} \;

# Veya dos2unix'i kur
# macOS: brew install dos2unix
# Ubuntu: sudo apt install dos2unix
```

---

## Yardım Alma

Hala sorunlar yaşıyorsanız:

1. **GitHub Issues'ı Kontrol Edin**: [github.com/affaan-m/everything-factory-droid/issues](https://github.com/affaan-m/everything-factory-droid/issues)
2. **Debug Logging'i Etkinleştirin**:
   ```bash
   export CLAUDE_DEBUG=1
   export CLAUDE_LOG_LEVEL=debug
   ```
3. **Diagnostic Bilgisi Toplayın**:
   ```bash
   droid --version
   node --version
   python3 --version
   echo $FACTORY_DROID_PACKAGE_MANAGER
   ls -la ~/.factory/plugins/cache/
   ```
4. **Issue Açın**: Debug loglarını, hata mesajlarını ve diagnostic bilgiyi dahil edin

---

## İlgili Dokümantasyon

- [README.md](./README.md) - Kurulum ve özellikler
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Geliştirme rehberleri
- [docs/](../) - Detaylı dokümantasyon
- [examples/](./examples/) - Kullanım örnekleri
