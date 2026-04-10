---
description: Çoklu agent orkestrasyonu — sıralı handoff'lar, paralel agentlar, worktree izolasyonu ve kontrol düzlemi snapshot'ları
---

# Orchestrate Komutu

Karmaşık görevler için çoklu agent iş akışlarını koordine edin. Sıralı agent handoff'larını, paralel yürütmeyi, worktree izolasyonunu ve operatör düzeyinde session yönetimini destekler.

## Workflow Tipleri

$ARGUMENTS:
- `feature <description>` — Tam özellik iş akışı
- `bugfix <description>` — Bug düzeltme iş akışı
- `refactor <description>` — Refactoring iş akışı
- `security <description>` — Güvenlik review iş akışı
- `custom <agents> <description>` — Özel agent dizisi

### Özel Workflow Örneği

```
/orchestrate custom "architect,tdd-guide,code-reviewer" "Caching katmanını yeniden tasarla"
```

## Agent Handoff Pipeline

Agentları sıralı olarak zincirleyin ve her adım arasında yapılandırılmış bağlam aktarın. Her agent, önceki agentın çıktısını alır ve kendi çıktısını ekleyerek bir sonrakine devreder.

Security Reviewer şablonu:

```markdown
Security Reviewer: [özet]

### FILES CHANGED

[Değiştirilen tüm dosyaların listesi]

### TEST RESULTS

[Test geçti/başarısız özeti]

### SECURITY STATUS

[Güvenlik bulguları]

### RECOMMENDATION

[SHIP / NEEDS WORK / BLOCKED]
```

## Paralel Yürütme

Tmux pane'leri ve izole git worktree'leri arasında paralel agent yürütmesi için bu komut `dmux-workflows` skillini kullanır. Aşağıdaki konular hakkında tam dokümantasyon için o skilli inceleyin:

- Tmux pane orkestrasyon kalıpları
- Worktree tabanlı paralel çalışma için `node scripts/orchestrate-worktrees.js` yardımcısı
- Worktree'ler arasında yerel dosya paylaşımı için `seedPaths` yapılandırması

Kalıcı otonom döngüler, zamanlama ve yönetişim için `autonomous-agent-harness` skilline bakın.

## Kontrol Düzlemi Snapshot'ları

Canlı bir tmux/worktree session için kontrol düzlemi snapshot'ı dışa aktarmak için şunu çalıştırın:

```bash
node scripts/orchestration-status.js .factory/plan/workflow-visual-proof.json
```

Snapshot; session aktivitesi, tmux pane metadata'sı, worker state'leri, hedefler, seed overlay'leri ve son handoff özetlerini JSON formatında içerir.

## Operatör Command-Center Handoff

İş akışı birden fazla session, worktree veya tmux pane'e yayıldığında, nihai handoff'a bir kontrol düzlemi bloğu ekleyin:

```markdown
CONTROL PLANE
-------------
Sessions:
- aktif session ID veya alias
- her aktif worker için branch + worktree yolu
- uygulanabilir durumlarda tmux pane veya detached session adı

Diffs:
- git status özeti
- dokunulan dosyalar için git diff --stat
- merge/çakışma risk notları

Approvals:
- bekleyen kullanıcı onayları
- onay bekleyen bloke adımlar

Telemetry:
- son aktivite timestamp'i veya idle sinyali
- tahmini token veya cost drift
- hook'lar veya reviewer'lar tarafından bildirilen policy olayları
```

Bu; planner, implementer, reviewer ve loop worker'larını operatör yüzeyinden anlaşılır tutar.

## İpuçları

1. **Karmaşık özellikler için planner ile başlayın**
2. **Merge'den önce her zaman code-reviewer dahil edin**
3. **Auth/ödeme/PII için security-reviewer kullanın**
4. **Handoff'ları kısa tutun** — sonraki agentın ihtiyaç duyduğu şeye odaklanın
5. **Gerekirse agentlar arasında doğrulama çalıştırın**
