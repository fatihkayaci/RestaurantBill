using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class UserBranch : BaseEntity
    {
        public Guid UserId { get; private set; }
        public User User { get; private set; } = default!;
        public Guid BranchId { get; private set; }
        public Branch Branch { get; private set; } = default!;
        public string UserName { get; private set; } = string.Empty;
        public string UserCode { get; private set; } = string.Empty;
        public UserRole Role { get; private set; }
        public bool IsActive { get; private set; } = true;

        protected UserBranch() { }

        public static UserBranch Create(User user, Branch branch, string userName, string userCode, UserRole role)
        {
            if (user == null)
                throw new DomainException("Geçersiz kullanıcı.");

            if (branch == null)
                throw new DomainException("Geçersiz şube.");

            if (string.IsNullOrWhiteSpace(userName))
                throw new DomainException("Kullanıcı adı boş bırakılamaz.");

            if (string.IsNullOrWhiteSpace(userCode))
                throw new DomainException("Kullanıcı kodu boş bırakılamaz.");

            return new UserBranch
            {
                User = user,
                UserId = user.Id,
                Branch = branch,
                BranchId = branch.Id,
                UserName = userName,
                UserCode = userCode,
                Role = role
            };
        }

        public void Update(string userName, string userCode, UserRole role)
        {
            if (string.IsNullOrWhiteSpace(userName))
                throw new DomainException("Kullanıcı adı boş bırakılamaz.");

            if (string.IsNullOrWhiteSpace(userCode))
                throw new DomainException("Kullanıcı kodu boş bırakılamaz.");

            UserName = userName;
            UserCode = userCode;
            Role = role;
        }

        public void ChangeBranch(Branch branch)
        {
            if (branch == null)
                throw new DomainException("Geçersiz şube.");

            Branch = branch;
            BranchId = branch.Id;
        }
    }
}
