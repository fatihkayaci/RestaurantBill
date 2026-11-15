using System.Security.Cryptography;
using System.Text;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Entities
{
    // Hesabı olmayan müşterinin telefonuna giden SMS kodu. Kullanıcıya bağlı VerificationCode'dan ayrıdır.
    // Kod ve doğrulama anahtarı yalnızca özetleri (hash) ile saklanır; özeti çağıran hesaplar.
    public class CustomerPhoneVerification : BaseEntity
    {
        public static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(5);
        public static readonly TimeSpan TokenLifetime = TimeSpan.FromMinutes(30);
        public const int MaxAttempts = 5;

        public Guid BranchId { get; private set; }
        public string Phone { get; private set; } = string.Empty;
        public string CodeHash { get; private set; } = string.Empty;
        public DateTime ExpiresAt { get; private set; }
        public int Attempts { get; private set; }
        public VerificationCodeStatus Status { get; private set; } = VerificationCodeStatus.Pending;
        public DateTime? VerifiedAt { get; private set; }
        // Doğrulama başarılı olunca verilen tek kullanımlık anahtarın özeti; sipariş gönderilirken harcanır.
        public string? VerificationTokenHash { get; private set; }
        public DateTime? TokenUsedAt { get; private set; }

        protected CustomerPhoneVerification() { }

        public static CustomerPhoneVerification Create(Guid branchId, string phone, string codeHash, DateTime utcNow)
        {
            if (branchId == Guid.Empty)
                throw new DomainException("Geçersiz şube.");

            string normalized = TurkishPhone.Normalize(phone);
            if (normalized.Length == 0)
                throw new DomainException("Geçerli bir telefon numarası girin.");

            if (string.IsNullOrWhiteSpace(codeHash))
                throw new DomainException("Doğrulama kodu boş olamaz.");

            return new CustomerPhoneVerification
            {
                BranchId = branchId,
                Phone = normalized,
                CodeHash = codeHash,
                ExpiresAt = utcNow.Add(CodeLifetime),
                Status = VerificationCodeStatus.Pending
            };
        }

        /// <summary>
        /// Girilen kodu dener. Doğruysa doğrulanır ve verilen anahtar özeti saklanır (true); yanlışsa deneme sayılır
        /// (false), son hakta kod geçersizleşir. Süresi dolmuş ya da kapanmış kodda DomainException.
        /// </summary>
        public bool Verify(string codeHash, string verificationTokenHash, DateTime utcNow)
        {
            if (Status != VerificationCodeStatus.Pending)
                throw new DomainException("Bu kod artık kullanılamaz, yeni kod isteyin.");

            if (utcNow >= ExpiresAt)
            {
                Status = VerificationCodeStatus.Expired;
                throw new DomainException("Kodun süresi doldu, yeni kod isteyin.");
            }

            Attempts++;
            if (!HashEquals(CodeHash, codeHash))
            {
                if (Attempts >= MaxAttempts)
                    Status = VerificationCodeStatus.Failed;
                return false;
            }

            if (string.IsNullOrWhiteSpace(verificationTokenHash))
                throw new DomainException("Geçersiz doğrulama anahtarı.");

            Status = VerificationCodeStatus.Verified;
            VerifiedAt = utcNow;
            VerificationTokenHash = verificationTokenHash;
            return true;
        }

        /// <summary>Doğrulama anahtarını sipariş için harcar; bir kez ve süresi içinde kullanılabilir.</summary>
        public void ConsumeToken(string verificationTokenHash, DateTime utcNow)
        {
            if (Status != VerificationCodeStatus.Verified || VerificationTokenHash is null || !HashEquals(VerificationTokenHash, verificationTokenHash))
                throw new DomainException("Telefon doğrulaması geçersiz, tekrar doğrulayın.");

            if (TokenUsedAt is not null)
                throw new DomainException("Bu doğrulama zaten kullanıldı, tekrar doğrulayın.");

            if (utcNow >= VerifiedAt!.Value.Add(TokenLifetime))
                throw new DomainException("Telefon doğrulamasının süresi doldu, tekrar doğrulayın.");

            TokenUsedAt = utcNow;
        }

        private static bool HashEquals(string a, string b)
            => CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b ?? string.Empty));
    }
}
