using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class VerificationCode : BaseEntity
    {
        public Guid UserId { get; private set; }
        public User User { get; private set; } = default!;
        public string Code { get; private set; } = string.Empty;
        public VerificationCodeType Type { get; private set; }
        public VerificationCodeStatus Status { get; private set; } = VerificationCodeStatus.Pending;
        public int Attempts { get; private set; } = 0;
        public DateTime ExpiresAt { get; private set; }

        protected VerificationCode() { }

        public static VerificationCode Create(Guid userId, string code, VerificationCodeType type, DateTime expiresAt)
        {
            if (userId == Guid.Empty)
                throw new DomainException("Geçersiz kullanıcı.");

            if (string.IsNullOrWhiteSpace(code))
                throw new DomainException("Doğrulama kodu boş olamaz.");

            return new VerificationCode
            {
                UserId = userId,
                Code = code,
                Type = type,
                Status = VerificationCodeStatus.Pending,
                Attempts = 0,
                ExpiresAt = expiresAt
            };
        }

        public void MarkAsVerified()
        {
            Status = VerificationCodeStatus.Verified;
        }

        public void IncrementAttempt()
        {
            Attempts++;
        }
    }
}
