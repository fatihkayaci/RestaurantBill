# Backend Roadmap — Portföy Hedefli Geliştirme Notları

Bu doküman, mevcut backend'in (Clean Architecture + CQRS + SignalR + custom JWT auth)
"çalışan demo"dan iş başvurusunda savunulabilir, sağlam bir projeye dönüşmesi için
çıkarılan öneri listesidir. Sıralama önceliklidir, yukarıdan aşağı uygulanması önerilir.

---

## 0. Önce bitirilmesi gereken (mevcut tasarım değişikliği) — TAMAMLANDI (2026-06-30)

`feat/remove-identity-custom-auth` branch'i ile ASP.NET Identity kaldırıldı ve custom
`IUnitOfWork` tabanlı auth'a geçildi. Geriye kalan temizlik yapıldı:

- [x] `RestaurantBill.Persistence.csproj` → `Microsoft.AspNetCore.Identity.EntityFrameworkCore`
      paket referansı kaldırıldı
- [x] `RestaurantBill.Domain.csproj` → `Microsoft.Extensions.Identity.Stores` paket
      referansı kaldırıldı
- [x] `RestaurantBill.WebAPI/Services/TurkishIdentityErrorDescriber.cs` → silindi
      (kullanılmıyordu)
- [x] `docs/architecture.md` güncellendi: "ASP.NET Identity + JWT" → custom JWT auth,
      RabbitMQ referansı kaldırıldı, README'deki "Key Design Decisions" ADR-007..010
      olarak buraya taşındı
- [x] `README.md` temizlendi: "Key Design Decisions" bölümü kaldırıldı (architecture.md'ye
      link verildi), Identity referansları custom auth'a göre güncellendi
- [x] `dotnet build` ile doğrulandı, derleme hatasız geçti

Not: Kalan `Microsoft.AspNetCore.Identity` namespace kullanımları (`IPasswordHasher<User>`)
meşru — framework'ün hafif şifre hash'leme arayüzü, tam Identity sistemi değil. Migration
dosyalarındaki "Identity" geçişleri ise Postgres'in IDENTITY column stratejisiyle ilgili,
auth ile alakasız.

---

## 1. Hızlı kazanımlar (1-2 günlük efor, projeyi "bitmiş" hissettirir)

- [x] **Test coverage** — `RestaurantBill.Domain.Tests` (6 entity, 50+ test),
      `RestaurantBill.Application.Tests` (49 command handler testi, elle yazılmış fake
      infrastructure) ve `RestaurantBill.Integration.Tests` (19 query handler testi, EF Core
      InMemory + gerçek UnitOfWork/Repositories) tamamlandı. AutoMapper kaldırılıp manuel
      `ToDto()` extension method'larına geçildi.
- [x] **CI/CD** — GitHub Actions ile push'ta build + test pipeline'ı (`dotnet-ci.yml`).
- [ ] **Health check endpoint** — ASP.NET Core'un yerleşik health check middleware'i ile
      `/health` (DB bağlantısı dahil).
- [ ] **Rate limiting** — ASP.NET Core yerleşik rate limiter middleware'i ile login/register
      gibi endpoint'lerde brute-force koruması.

---

## 2. Gerçek farklar (orta efor, yüksek etki — mülakatta "neden" sorusuna cevap verebileceğin işler)

- [ ] **Redis ile distributed cache** — `CachingBehavior` şu an `MemoryCache` kullanıyor.
      Redis'e geçmek "neden memory değil, neden Redis" sorusuna gerçek bir cevap verme
      fırsatı sağlar.
- [ ] **Multi-tenancy / abonelik sistemi (üyelik)** — `Restaurant` entity'si zaten var.
      Farklı restoranların kayıt olup kendi menü/masa/kullanıcılarını izole şekilde
      yönetebildiği gerçek bir SaaS modeline geçmek: plan/abonelik (Basic/Pro), restoran
      bazlı veri izolasyonu, onboarding akışı.
- [ ] **Background jobs + gelişmiş raporlama** — Hangfire/Quartz ile zamanlanmış işler
      (gün sonu özet e-postası), `StatsController`'ı tek "overview" query'sinin ötesine
      taşıyan trend analizi (saatlik yoğunluk, en çok satan ürün periyodu).
- [ ] **Observability** — Serilog var ama distributed tracing/metrics yok. OpenTelemetry
      ile "neden yavaşladı, hangi request patladı" sorusuna cevap verebilme.

---

## 3. Yapma (solo portföy projesi için overkill, mülakatta olumsuz puana dönüşebilir)

- Mikroservis mimarisi, Kubernetes, event sourcing, CQRS'i ayrı veritabanlarına bölmek.
  "Kaç kullanıcı için tasarladın, neden buna ihtiyaç duydun" sorusuna gerçekçi cevap
  veremeyeceğin ölçek — bu projenin boyutunda gereksiz karmaşıklık olarak görülür.

---

*Bu liste 2026-06-30 tarihli bir backend taramasına ve sohbete dayanır. Güncel kod
durumunu doğrulamadan madde işaretlemeden önce ilgili dosyaları kontrol et.*
