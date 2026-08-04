namespace RestaurantBill.Domain.Entities
{
    public class Branch : BaseEntity
    {
        public Guid CompanyId { get; private set; }
        public Company Company { get; private set; } = default!;
        
        public string BranchName { get; private set; } = string.Empty;
        public string ManagerName { get; private set; } = string.Empty;
        public string Number { get; private set; } = string.Empty;
        public string Email { get; private set; } = string.Empty;
        public string City { get; private set; } = string.Empty;
        public string District { get; private set; } = string.Empty;
        public string OpenAddress { get; private set; } = string.Empty;
        public decimal TaxRate { get; private set; }

        protected Branch() { }

        public static Branch Create(string name)
        {
            return new Branch { BranchName = name };
        }

        public static Branch Create(Guid companyId, string branchName, string managerName, string number, string email, string city, string district, string openAddress, decimal taxRate)
        {
            return new Branch
            {
                CompanyId = companyId,
                BranchName = branchName,
                ManagerName = managerName,
                Number = number,
                Email = email,
                City = city,
                District = district,
                OpenAddress = openAddress,
                TaxRate = taxRate
            };
        }

        public void Update(string branchName, string managerName, string number, string email, string city, string district, string openAddress, decimal taxRate)
        {
            BranchName = branchName;
            ManagerName = managerName;
            Number = number;
            Email = email;
            City = city;
            District = district;
            OpenAddress = openAddress;
            TaxRate = taxRate;
        }
    }
}
