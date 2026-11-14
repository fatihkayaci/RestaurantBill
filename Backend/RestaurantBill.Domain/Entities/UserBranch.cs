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
        public DateTime? HireDate { get; private set; }
        // Garsonun çalıştığı bölgeler. Boş liste = şubenin tüm bölgeleri. Diğer rollerde yok sayılır.
        public List<Guid> RegionIds { get; private set; } = [];
        // Masa masa bakılan bölgeler (RegionIds'in alt kümesi; yönetici "Seçili masalar" demiş). Bu bölgelerde garson
        // yalnızca TableIds'teki masalara bakar, diğer bölgelerinin tamamına. RegionIds boşken ikisi de anlamsızdır.
        public List<Guid> RestrictedRegionIds { get; private set; } = [];
        // Masa masa bakılan bölgelerde seçilmiş masalar.
        public List<Guid> TableIds { get; private set; } = [];
        // Mutfak kullanıcısının hazırladığı menü kategorileri ("Izgara", "Tatlılar"). Boş liste = tüm kategoriler.
        // Diğer rollerde yok sayılır.
        public List<Guid> CategoryIds { get; private set; } = [];
        // Garson yetkileri; diğer rollerde yok sayılır. Yeni garson yalnızca sipariş alabilir.
        public bool CanTakeOrders { get; private set; } = true;
        public bool CanTakePayment { get; private set; }
        public bool CanCancelAndDiscount { get; private set; }
        public bool CanTransferAndReserve { get; private set; }
        // Kasiyer yetkileri; diğer rollerde yok sayılır. Kasiyer bugüne kadar bunların hepsini yapabiliyordu,
        // varsayılan bu yüzden açık ve indirim sınırı %100 (sınırsız).
        public bool CanApplyDiscount { get; private set; } = true;
        public int MaxDiscountPercent { get; private set; } = 100;
        public bool CanTransferTables { get; private set; } = true;

        protected UserBranch() { }

        public static UserBranch Create(User user, Branch branch, string userName, string? userCode, UserRole role)
        {
            if (user == null)
                throw new DomainException("Geçersiz kullanıcı.");

            if (branch == null)
                throw new DomainException("Geçersiz şube.");

            if (string.IsNullOrWhiteSpace(userName))
                throw new DomainException("Kullanıcı adı boş bırakılamaz.");

            return new UserBranch
            {
                User = user,
                UserId = user.Id,
                Branch = branch,
                BranchId = branch.Id,
                UserName = userName,
                UserCode = userCode ?? string.Empty,
                Role = role
            };
        }

        public void Update(string userName, string? userCode, UserRole role)
        {
            if (string.IsNullOrWhiteSpace(userName))
                throw new DomainException("Kullanıcı adı boş bırakılamaz.");

            UserName = userName;
            if (!string.IsNullOrWhiteSpace(userCode))
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

        // Şubeden çıkarılıp sonra yeniden atanan admin: (UserId, BranchId) tekil indeksi yüzünden satır silinmez, geri açılır.
        public void Restore()
        {
            IsDeleted = false;
            SetUpdatedAt();
        }

        public void SetRegions(IEnumerable<Guid>? regionIds)
        {
            RegionIds = (regionIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList();
        }

        public void SetTableRestriction(IEnumerable<Guid>? restrictedRegionIds, IEnumerable<Guid>? tableIds)
        {
            RestrictedRegionIds = (restrictedRegionIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList();
            TableIds = (tableIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList();
        }

        public void SetCategories(IEnumerable<Guid>? categoryIds)
        {
            CategoryIds = (categoryIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList();
        }

        public void SetWaiterPermissions(bool canTakeOrders, bool canTakePayment, bool canCancelAndDiscount, bool canTransferAndReserve)
        {
            CanTakeOrders = canTakeOrders;
            CanTakePayment = canTakePayment;
            CanCancelAndDiscount = canCancelAndDiscount;
            CanTransferAndReserve = canTransferAndReserve;
        }

        public void SetCashierPermissions(bool canApplyDiscount, int maxDiscountPercent, bool canTransferTables)
        {
            if (maxDiscountPercent is < 1 or > 100)
                throw new DomainException("İndirim sınırı %1 ile %100 arasında olmalıdır.");

            CanApplyDiscount = canApplyDiscount;
            MaxDiscountPercent = maxDiscountPercent;
            CanTransferTables = canTransferTables;
        }

        public void SetHireDate(DateTime hireDate)
        {
            HireDate = hireDate.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(hireDate, DateTimeKind.Utc)
                : hireDate.ToUniversalTime();
        }
    }
}
