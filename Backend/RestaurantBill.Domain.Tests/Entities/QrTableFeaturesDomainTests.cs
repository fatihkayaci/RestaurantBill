using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Tests.Entities;

// QR masa menüsü özellikleri: sipariş aşaması, kalemin talep bağı, hesap tercihi, alerjenler, kategori servis penceresi.
public class QrTableFeaturesDomainTests
{
    private static void SetId(BaseEntity entity, Guid id) =>
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static Product NewProduct(string name = "Künefe", decimal price = 100m)
    {
        Product product = Product.Create(name, price, "", Guid.NewGuid());
        SetId(product, Guid.NewGuid());
        return product;
    }

    // ── Sipariş aşaması ─────────────────────────────────────────────────────────────────────────

    public class StageDerivation
    {
        private static OrderRequestStage Approved(params OrderItemStatus[] statuses)
            => OrderRequestStages.Derive(OrderRequestStatus.Approved, itemsLinked: true, orderClosed: false, statuses);

        [Theory]
        [InlineData(OrderRequestStatus.Pending, OrderRequestStage.Sent)]
        [InlineData(OrderRequestStatus.Rejected, OrderRequestStage.Rejected)]
        [InlineData(OrderRequestStatus.Cancelled, OrderRequestStage.Cancelled)]
        [InlineData(OrderRequestStatus.Expired, OrderRequestStage.Cancelled)]
        public void NonApprovedStatus_MapsDirectly(OrderRequestStatus status, OrderRequestStage expected)
            => Assert.Equal(expected, OrderRequestStages.Derive(status, false, false, []));

        [Fact]
        public void AllPending_IsApproved()
            => Assert.Equal(OrderRequestStage.Approved, Approved(OrderItemStatus.Pending, OrderItemStatus.Pending));

        [Fact]
        public void AnyPreparing_IsPreparing()
            => Assert.Equal(OrderRequestStage.Preparing, Approved(OrderItemStatus.Pending, OrderItemStatus.Preparing));

        [Fact]
        public void SomeReadySomePending_IsPreparing_LeastAdvancedDecides()
            => Assert.Equal(OrderRequestStage.Preparing, Approved(OrderItemStatus.Ready, OrderItemStatus.Pending));

        [Fact]
        public void AllReadyOrBeyond_IsOnTheWay()
            => Assert.Equal(OrderRequestStage.OnTheWay, Approved(OrderItemStatus.Ready, OrderItemStatus.Served));

        [Fact]
        public void AllServed_IsServed()
            => Assert.Equal(OrderRequestStage.Served, Approved(OrderItemStatus.Served, OrderItemStatus.Served));

        [Fact]
        public void LinkedItemsAllPaidOrRemoved_CountAsDone()
            => Assert.Equal(OrderRequestStage.Served, Approved());

        [Fact]
        public void LegacyRequestWithoutLink_FallsBackToOrderState()
        {
            Assert.Equal(OrderRequestStage.Approved, OrderRequestStages.Derive(OrderRequestStatus.Approved, false, orderClosed: false, []));
            Assert.Equal(OrderRequestStage.Served, OrderRequestStages.Derive(OrderRequestStatus.Approved, false, orderClosed: true, []));
        }
    }

    // ── Kalemin talep bağı ──────────────────────────────────────────────────────────────────────

    public class RequestLink
    {
        [Fact]
        public void AddItem_StoresRequestId_AndDoesNotMergeWithAnotherRequestsLine()
        {
            Product product = NewProduct();
            Guid first = Guid.NewGuid(), second = Guid.NewGuid();
            Order order = Order.Create(Guid.NewGuid(), Guid.NewGuid());

            order.AddItem(product, 1, orderRequestId: first);
            order.AddItem(product, 2, orderRequestId: second);
            order.AddItem(product, 1, orderRequestId: first);

            Assert.Equal(2, order.OrderItems.Count);
            Assert.Equal(2, order.OrderItems.Single(i => i.OrderRequestId == first).Quantity);
            Assert.Equal(2, order.OrderItems.Single(i => i.OrderRequestId == second).Quantity);
        }

        [Fact]
        public void SetMenuComponents_InheritTheRequestId()
        {
            Product adana = NewProduct("Adana");
            SetMenu menu = SetMenu.Create(Guid.NewGuid(), "Adana Menü");
            SetId(menu, Guid.NewGuid());
            menu.SetContents([new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(adana, false)])], DiscountType.None, 0m);
            Guid requestId = Guid.NewGuid();
            Order order = Order.Create(Guid.NewGuid(), Guid.NewGuid());

            order.AddSetMenu(menu, new Dictionary<Guid, Guid>(), 1, 10m, orderRequestId: requestId);

            Assert.All(order.OrderItems, i => Assert.Equal(requestId, i.OrderRequestId));
        }

        [Fact]
        public void MergeFrom_KeepsRequestIds_AndOnlyMergesSameRequestLines()
        {
            Product product = NewProduct();
            Guid requestA = Guid.NewGuid(), requestB = Guid.NewGuid();
            Order target = Order.Create(Guid.NewGuid(), Guid.NewGuid());
            target.AddItem(product, 1, orderRequestId: requestA);
            Order source = Order.Create(Guid.NewGuid(), Guid.NewGuid());
            source.AddItem(product, 1, orderRequestId: requestB);
            source.AddItem(NewProduct("Ayran", 20m), 1, orderRequestId: requestA);

            target.MergeFrom(source);

            Assert.Equal(3, target.OrderItems.Count);
            Assert.Single(target.OrderItems, i => i.OrderRequestId == requestB);
            Assert.Equal(2, target.OrderItems.Count(i => i.OrderRequestId == requestA));
            Assert.Empty(source.OrderItems);
        }
    }

    // ── Hesap isteğinde müşteri tercihi ─────────────────────────────────────────────────────────

    public class BillHint
    {
        private static Order TableOrder() => Order.Create(Guid.NewGuid(), Guid.NewGuid());

        [Fact]
        public void RequestBill_StoresHint_AndLastRequestWins()
        {
            Order order = TableOrder();
            DateTime first = new(2026, 11, 22, 12, 0, 0, DateTimeKind.Utc);

            order.RequestBill(first, BillPaymentHint.Card, 3);
            Assert.Equal(BillPaymentHint.Card, order.BillPaymentHint);
            Assert.Equal(3, order.BillSplitCount);

            order.RequestBill(first.AddMinutes(2), BillPaymentHint.Cash, null);
            Assert.Equal(BillPaymentHint.Cash, order.BillPaymentHint);
            Assert.Null(order.BillSplitCount);
            Assert.Equal(first, order.BillRequestedAt);
        }

        [Fact]
        public void StaffRequestBill_KeepsTheCustomersHint()
        {
            Order order = TableOrder();
            order.RequestBill(DateTime.UtcNow, BillPaymentHint.Iban, 2);
            order.RequestBill(DateTime.UtcNow);
            Assert.Equal(BillPaymentHint.Iban, order.BillPaymentHint);
            Assert.Equal(2, order.BillSplitCount);
        }

        [Fact]
        public void ClearBillRequest_Close_And_Cancel_ClearTheHint()
        {
            Order cleared = TableOrder();
            cleared.RequestBill(DateTime.UtcNow, BillPaymentHint.Card, 4);
            cleared.ClearBillRequest();
            Assert.Null(cleared.BillPaymentHint);
            Assert.Null(cleared.BillSplitCount);

            Order closed = TableOrder();
            closed.RequestBill(DateTime.UtcNow, BillPaymentHint.Card, 4);
            closed.Close();
            Assert.Null(closed.BillPaymentHint);
            Assert.Null(closed.BillSplitCount);

            Order cancelled = TableOrder();
            cancelled.RequestBill(DateTime.UtcNow, BillPaymentHint.Cash, 2);
            cancelled.Cancel();
            Assert.Null(cancelled.BillPaymentHint);
        }

        [Theory]
        [InlineData(1)]
        [InlineData(21)]
        public void SplitCountOutOfRange_Throws(int count)
            => Assert.Throws<DomainException>(() => TableOrder().RequestBill(DateTime.UtcNow, null, count));
    }

    // ── Alerjen / diyet etiketleri ──────────────────────────────────────────────────────────────

    public class Dietary
    {
        [Fact]
        public void SetDietaryInfo_StoresFlags()
        {
            Product product = NewProduct();
            product.SetDietaryInfo(ProductAllergen.Milk | ProductAllergen.TreeNuts, ProductDietTag.Vegetarian | ProductDietTag.Spicy);

            Assert.Equal(ProductAllergen.Milk | ProductAllergen.TreeNuts, product.Allergens);
            Assert.Equal(ProductDietTag.Vegetarian | ProductDietTag.Spicy, product.DietTags);
        }

        [Fact]
        public void UnknownFlag_Throws()
        {
            Assert.Throws<DomainException>(() => NewProduct().SetDietaryInfo((ProductAllergen)(1 << 20), ProductDietTag.None));
            Assert.Throws<DomainException>(() => NewProduct().SetDietaryInfo(ProductAllergen.None, (ProductDietTag)(1 << 9)));
        }

        [Fact]
        public void ContradictoryClaims_Throw()
        {
            Assert.Throws<DomainException>(() => NewProduct().SetDietaryInfo(ProductAllergen.Milk, ProductDietTag.Vegan));
            Assert.Throws<DomainException>(() => NewProduct().SetDietaryInfo(ProductAllergen.Gluten, ProductDietTag.GlutenFree));
        }
    }

    // ── Kategori servis penceresi ───────────────────────────────────────────────────────────────

    public class AvailabilityWindow
    {
        private static Category Windowed(int? days, string? from, string? until)
        {
            Category category = Category.Create("Pide", Guid.NewGuid());
            category.SetAvailability(days, from is null ? null : TimeOnly.Parse(from), until is null ? null : TimeOnly.Parse(until));
            return category;
        }

        // 2026-11-20 Cuma, 2026-11-21 Cumartesi.
        private static DateTime Local(int day, int hour, int minute = 0) => new(2026, 11, day, hour, minute, 0);

        [Fact]
        public void NoWindow_IsAlwaysAvailable()
        {
            Category category = Category.Create("Kahve", Guid.NewGuid());
            Assert.False(category.HasAvailabilityWindow);
            Assert.True(category.IsAvailableAt(Local(20, 3)));
            Assert.Equal(string.Empty, category.AvailabilityLabel());
        }

        [Fact]
        public void UntilOnly_StopsAtThatHour()
        {
            Category pide = Windowed(null, null, "22:00");
            Assert.True(pide.IsAvailableAt(Local(20, 21, 59)));
            Assert.False(pide.IsAvailableAt(Local(20, 22, 0)));
            Assert.Equal("22:00'ye kadar", pide.AvailabilityLabel());
        }

        [Fact]
        public void FromOnly_StartsAtThatHour()
        {
            Category dinner = Windowed(null, "18:00", null);
            Assert.False(dinner.IsAvailableAt(Local(20, 17, 59)));
            Assert.True(dinner.IsAvailableAt(Local(20, 23, 30)));
            Assert.Equal("18:00'den itibaren", dinner.AvailabilityLabel());
        }

        [Fact]
        public void WeekdayBreakfast_RespectsDaysAndHours()
        {
            Category breakfast = Windowed(Category.WeekdaysMask, "08:00", "12:00");
            Assert.True(breakfast.IsAvailableAt(Local(20, 9)));   // Cuma
            Assert.False(breakfast.IsAvailableAt(Local(21, 9)));  // Cumartesi
            Assert.False(breakfast.IsAvailableAt(Local(20, 12)));
            Assert.Equal("Hafta içi 08:00–12:00", breakfast.AvailabilityLabel());
        }

        [Fact]
        public void CrossingMidnight_BelongsToTheStartDay()
        {
            // Yalnız Cuma gecesi 22:00–02:00.
            Category lateNight = Windowed(1 << (int)DayOfWeek.Friday, "22:00", "02:00");
            Assert.True(lateNight.IsAvailableAt(Local(20, 23)));     // Cuma 23:00
            Assert.True(lateNight.IsAvailableAt(Local(21, 1, 30)));  // Cumartesi 01:30 → Cuma'nın penceresi
            Assert.False(lateNight.IsAvailableAt(Local(21, 2)));
            Assert.False(lateNight.IsAvailableAt(Local(21, 23)));    // Cumartesi gecesi kapalı
            Assert.False(lateNight.IsAvailableAt(Local(20, 1)));     // Cuma 01:00 → Perşembe'nin penceresi, seçili değil
        }

        [Fact]
        public void InvalidWindow_Throws()
        {
            Assert.Throws<DomainException>(() => Windowed(0, null, null));
            Assert.Throws<DomainException>(() => Windowed(null, "10:00", "10:00"));
        }

        [Fact]
        public void AllDaysMask_IsStoredAsEveryDay()
        {
            Category category = Windowed(Category.AllDaysMask, null, "12:00");
            Assert.Null(category.AvailableDays);
        }

        [Theory]
        [InlineData("10:00", "10:00'a", "10:00'dan")]
        [InlineData("12:00", "12:00'ye", "12:00'den")]
        [InlineData("15:00", "15:00'e", "15:00'ten")]
        [InlineData("16:00", "16:00'ya", "16:00'dan")]
        [InlineData("12:30", "12:30'a", "12:30'dan")]
        [InlineData("00:00", "00:00'a", "00:00'dan")]
        public void TurkishSuffixes(string time, string dative, string ablative)
        {
            TimeOnly t = TimeOnly.Parse(time);
            Assert.Equal(dative, TurkishTime.Dative(t));
            Assert.Equal(ablative, TurkishTime.Ablative(t));
        }
    }
}
