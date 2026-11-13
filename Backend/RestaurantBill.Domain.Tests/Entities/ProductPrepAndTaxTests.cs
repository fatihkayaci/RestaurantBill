using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class ProductPrepAndTaxTests
{
    private static Product CreateProduct(decimal? categoryTax, decimal branchTax = 10m)
    {
        Branch branch = Branch.Create(Guid.NewGuid(), "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", branchTax);
        Category category = Category.Create("Ana Yemek", Guid.NewGuid(), categoryTax);
        typeof(Category).GetProperty(nameof(Category.Branch))!.SetValue(category, branch);

        Product product = Product.Create("Köfte", 100m, "", Guid.NewGuid());
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(product, Guid.NewGuid());
        typeof(Product).GetProperty(nameof(Product.Category))!.SetValue(product, category);
        return product;
    }

    public class TaxRate
    {
        [Fact]
        public void WithoutOverride_UsesCategoryRate()
        {
            Product product = CreateProduct(categoryTax: 20m);
            Assert.Equal(20m, product.GetEffectiveTaxRate());
        }

        [Fact]
        public void WithoutOverrideAndCategoryRate_UsesBranchRate()
        {
            Product product = CreateProduct(categoryTax: null, branchTax: 10m);
            Assert.Equal(10m, product.GetEffectiveTaxRate());
        }

        [Fact]
        public void WithOverride_UsesProductRate()
        {
            Product product = CreateProduct(categoryTax: 20m);
            product.SetTaxRate(1m);
            Assert.Equal(1m, product.GetEffectiveTaxRate());

            product.SetTaxRate(null);
            Assert.Equal(20m, product.GetEffectiveTaxRate());
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(101)]
        public void OutOfRange_Throws(decimal rate)
        {
            Product product = CreateProduct(categoryTax: 20m);
            Assert.Throws<DomainException>(() => product.SetTaxRate(rate));
        }

        [Fact]
        public void OrderItem_SnapshotsEffectiveRate()
        {
            Product product = CreateProduct(categoryTax: 20m);
            product.SetTaxRate(8m);
            Order order = Order.Create(Guid.NewGuid());
            order.AddItem(product, 1, product.GetEffectiveTaxRate());

            Assert.Equal(8m, Assert.Single(order.OrderItems).TaxRate);
        }
    }

    public class PrepTime
    {
        [Theory]
        [InlineData(0)]
        [InlineData(241)]
        public void OutOfRange_Throws(int minutes)
        {
            Product product = CreateProduct(categoryTax: null);
            Assert.Throws<DomainException>(() => product.SetPrepMinutes(minutes));
        }

        [Fact]
        public void Null_ClearsPrepTime()
        {
            Product product = CreateProduct(categoryTax: null);
            product.SetPrepMinutes(15);
            product.SetPrepMinutes(null);
            Assert.Null(product.PrepMinutes);
        }

        private static OrderItem CreateItem(int? prepMinutes, DateTime createdAt)
        {
            Product product = CreateProduct(categoryTax: null);
            product.SetPrepMinutes(prepMinutes);
            Order order = Order.Create(Guid.NewGuid());
            order.AddItem(product, 1);
            OrderItem item = Assert.Single(order.OrderItems);
            typeof(BaseEntity).GetProperty(nameof(BaseEntity.CreatedAt))!.SetValue(item, createdAt);
            return item;
        }

        [Fact]
        public void OrderItem_SnapshotsPrepMinutes_AndComputesDueAt()
        {
            DateTime created = new(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc);
            OrderItem item = CreateItem(15, created);

            Assert.Equal(15, item.PrepMinutes);
            Assert.Equal(created.AddMinutes(15), item.GetDueAt());
            Assert.False(item.IsOverdue(created.AddMinutes(14)));
            Assert.True(item.IsOverdue(created.AddMinutes(15)));
        }

        [Fact]
        public void WithoutPrepTime_IsNeverOverdue()
        {
            DateTime created = new(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc);
            OrderItem item = CreateItem(null, created);

            Assert.Null(item.GetDueAt());
            Assert.False(item.IsOverdue(created.AddHours(5)));
            Assert.False(item.TryMarkOverdueNotified(created.AddHours(5)));
        }

        [Fact]
        public void ReadyItem_IsNotOverdue()
        {
            DateTime created = new(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc);
            OrderItem item = CreateItem(10, created);
            item.UpdateStatus(OrderItemStatus.Ready);

            Assert.False(item.IsOverdue(created.AddMinutes(30)));
        }

        [Fact]
        public void TryMarkOverdueNotified_MarksOnlyOnce()
        {
            DateTime created = new(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc);
            OrderItem item = CreateItem(10, created);

            Assert.False(item.TryMarkOverdueNotified(created.AddMinutes(5)));
            Assert.True(item.TryMarkOverdueNotified(created.AddMinutes(11)));
            Assert.Equal(created.AddMinutes(11), item.OverdueNotifiedAt);
            Assert.False(item.TryMarkOverdueNotified(created.AddMinutes(12)));
        }
    }
}
