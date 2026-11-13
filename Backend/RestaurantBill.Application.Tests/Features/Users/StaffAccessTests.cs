using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
using RestaurantBill.Application.Features.Tables.Queries.GetAllTable;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Users;

// Garson bölge kısıtı ve yetkileri, mutfak kategori kısıtı.
public class StaffAccessTests : ApplicationTestBase
{
    private Branch? _branch;

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task<Branch> BranchAsync()
    {
        if (_branch is not null) return _branch;
        _branch = Branch.Create("Test Restoran");
        SetId(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);
        await DbContext.SaveChangesAsync();
        return _branch;
    }

    // Şubede verilen rolde bir personel ve onun kimliğiyle çalışan sahte oturum.
    private async Task<FakeCurrentUserService> SeedStaffAsync(UserRole role, Action<UserBranch>? configure = null)
    {
        Branch branch = await BranchAsync();
        User user = User.Create("Personel", "", "");
        DbContext.Users.Add(user);
        UserBranch membership = UserBranch.Create(user, branch, $"p{Guid.NewGuid():N}"[..10], null, role);
        configure?.Invoke(membership);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();

        return new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = user.Id, Role = role.ToString() };
    }

    private async Task<Table> SeedTableInAsync(Region region, string name = "Masa")
    {
        Table table = Table.Create(name, "", region.Id);
        DbContext.Tables.Add(table);
        await DbContext.SaveChangesAsync();
        return table;
    }

    [Fact]
    public async Task Waiter_OutsideAssignedRegion_CannotOpenOrder()
    {
        Region salon = await SeedRegionAsync();
        Region bahce = await SeedRegionAsync();
        Table bahceTable = await SeedTableInAsync(bahce);
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter, m => m.SetRegions([salon.Id]));

        var result = await new CreateOrderCommandHandler(Db, waiter).Handle(new CreateOrderCommand { TableId = bahceTable.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, result.Error);
        Assert.Empty(DbContext.Orders.ToList());
    }

    [Fact]
    public async Task Waiter_InsideAssignedRegion_CanOpenOrder()
    {
        Region salon = await SeedRegionAsync();
        Table salonTable = await SeedTableInAsync(salon);
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter, m => m.SetRegions([salon.Id]));

        var result = await new CreateOrderCommandHandler(Db, waiter).Handle(new CreateOrderCommand { TableId = salonTable.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Waiter_WithoutTakeOrdersPermission_CannotOpenOrder()
    {
        Table table = await SeedTableAsync();
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter, m => m.SetWaiterPermissions(false, false, false, false));

        var result = await new CreateOrderCommandHandler(Db, waiter).Handle(new CreateOrderCommand { TableId = table.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.DeniedMessage(WaiterPermission.TakeOrders), result.Error);
    }

    [Fact]
    public async Task Waiter_WithoutCancelPermission_CannotCancelOrder()
    {
        Table table = await SeedTableAsync();
        table.Occupy();
        Order order = Order.Create(table.Id);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter); // yeni garson varsayılanı: yalnızca sipariş

        var handler = new CancelOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), waiter);
        var result = await handler.Handle(new CancelOrderCommand { OrderId = order.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.DeniedMessage(WaiterPermission.CancelAndDiscount), result.Error);
        Assert.NotEqual(OrderStatus.Cancelled, order.Status);
    }

    [Fact]
    public async Task Waiter_WithoutReservePermission_CannotReserve()
    {
        Table table = await SeedTableAsync();
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter);

        var handler = new ReservationTableCommandHandler(Db, new FakeTableNotificationService(), waiter);
        var result = await handler.Handle(new ReservationTableCommand { TableId = table.Id, GuestName = "Ali", ReservationTime = "19:30" }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.DeniedMessage(WaiterPermission.TransferAndReserve), result.Error);
    }

    [Fact]
    public async Task Admin_IsNotAffectedByPermissionsOrRegions()
    {
        Table table = await SeedTableAsync();
        await SeedActorAsync();

        var result = await new CreateOrderCommandHandler(Db, CurrentUser).Handle(new CreateOrderCommand { TableId = table.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Waiter_TableList_ShowsOnlyAssignedRegions()
    {
        Region salon = await SeedRegionAsync();
        Region bahce = await SeedRegionAsync();
        Table salonTable = await SeedTableInAsync(salon, "S1");
        await SeedTableInAsync(bahce, "B1");
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter, m => m.SetRegions([salon.Id]));
        FakeCurrentUserService allRegionsWaiter = await SeedStaffAsync(UserRole.Waiter);

        var restricted = await new GetAllTableQueryHandler(Db, waiter).Handle(new GetAllTableQuery(), CancellationToken.None);
        var unrestricted = await new GetAllTableQueryHandler(Db, allRegionsWaiter).Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Equal(salonTable.Id, Assert.Single(restricted.Value!).Id);
        Assert.Equal(2, unrestricted.Value!.Count);
    }

    private async Task<Category> SeedNamedCategoryAsync(string name)
    {
        Category category = Category.Create(name, CurrentUser.BranchId);
        DbContext.Categories.Add(category);
        await DbContext.SaveChangesAsync();
        return category;
    }

    private async Task<Product> SeedProductAsync(Category category, string name)
    {
        Product product = Product.Create(name, 100m, "", category.Id);
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();
        return product;
    }

    // Izgara + tatlı içeren tek masa siparişi.
    private async Task<(Order order, Category izgara, Category tatli)> SeedMixedOrderAsync()
    {
        Category izgara = await SeedNamedCategoryAsync("Izgara");
        Category tatli = await SeedNamedCategoryAsync("Tatlılar");
        Product kofte = await SeedProductAsync(izgara, "Köfte");
        Product kunefe = await SeedProductAsync(tatli, "Künefe");
        Table table = await SeedTableAsync();
        Order order = Order.Create(table.Id);
        order.AddItem(kofte, 2);
        order.AddItem(kunefe, 1);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        return (order, izgara, tatli);
    }

    private UpdateOrderStatusCommandHandler OrderStatusHandler(FakeCurrentUserService user)
        => new(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), user);

    [Fact]
    public async Task Kitchen_WithCategories_SeesOnlyItsItems_AndMixedOrderIsSplit()
    {
        (Order mixed, Category izgara, Category tatli) = await SeedMixedOrderAsync();
        // Yalnızca tatlı içeren ikinci sipariş ızgaracıya hiç görünmez.
        Product sutlac = await SeedProductAsync(tatli, "Sütlaç");
        Order dessertOnly = Order.Create((await SeedTableAsync()).Id);
        dessertOnly.AddItem(sutlac, 1);
        DbContext.Orders.Add(dessertOnly);
        await DbContext.SaveChangesAsync();

        FakeCurrentUserService grill = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([izgara.Id]));
        FakeCurrentUserService dessert = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([tatli.Id]));

        var grillView = await new GetAllOrdersToKitchenQueryHandler(Db, grill).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);
        var dessertView = await new GetAllOrdersToKitchenQueryHandler(Db, dessert).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        var grillOrder = Assert.Single(grillView.Value!);
        Assert.Equal(mixed.Id, grillOrder.Id);
        Assert.Equal("Köfte", Assert.Single(grillOrder.OrderItems).ProductName);
        Assert.Equal(200m, grillOrder.TotalPrice);

        Assert.Equal(2, dessertView.Value!.Count);
        Assert.Equal("Künefe", Assert.Single(dessertView.Value!.Single(o => o.Id == mixed.Id).OrderItems).ProductName);
    }

    [Fact]
    public async Task Kitchen_WithoutCategories_SeesEverything()
    {
        (Order mixed, _, _) = await SeedMixedOrderAsync();
        FakeCurrentUserService kitchen = await SeedStaffAsync(UserRole.Kitchen);

        var result = await new GetAllOrdersToKitchenQueryHandler(Db, kitchen).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        Assert.Equal(2, Assert.Single(result.Value!).OrderItems.Count);
        Assert.Equal(mixed.TotalPrice, result.Value![0].TotalPrice);
    }

    [Fact]
    public async Task Kitchen_RegionsAreIgnored_OnlyWaitersAreRegionScoped()
    {
        Region salon = await SeedRegionAsync();
        Region teras = await SeedRegionAsync();
        Table terasTable = await SeedTableInAsync(teras, "T1");
        DbContext.Orders.Add(Order.Create(terasTable.Id));
        await DbContext.SaveChangesAsync();
        // Eski veride kalmış bir bölge ataması mutfağı kısıtlamaz.
        FakeCurrentUserService kitchen = await SeedStaffAsync(UserRole.Kitchen, m => m.SetRegions([salon.Id]));

        var result = await new GetAllOrdersToKitchenQueryHandler(Db, kitchen).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task Kitchen_ItemStatusOutsideCategories_IsRejected()
    {
        (Order order, Category izgara, _) = await SeedMixedOrderAsync();
        OrderItem kunefe = order.OrderItems.Single(i => i.Product.Name == "Künefe");
        OrderItem kofte = order.OrderItems.Single(i => i.Product.Name == "Köfte");
        FakeCurrentUserService grill = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([izgara.Id]));
        var handler = new UpdateOrderItemStatusCommandHandler(Db, new FakeTableNotificationService(), grill);

        var denied = await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = kunefe.Id, Status = (int)OrderItemStatus.Ready }, CancellationToken.None);
        var allowed = await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = kofte.Id, Status = (int)OrderItemStatus.Ready }, CancellationToken.None);

        Assert.False(denied.IsSuccess);
        Assert.Equal(StaffAccess.CategoryDeniedMessage, denied.Error);
        Assert.Equal(OrderItemStatus.Pending, kunefe.Status);
        Assert.True(allowed.IsSuccess);
        Assert.Equal(OrderItemStatus.Ready, kofte.Status);
    }

    [Fact]
    public async Task Kitchen_AllReady_MarksOnlyOwnItems_OrderReadyWhenEveryStationIsDone()
    {
        (Order order, Category izgara, Category tatli) = await SeedMixedOrderAsync();
        FakeCurrentUserService grill = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([izgara.Id]));
        FakeCurrentUserService dessert = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([tatli.Id]));
        OrderStatus before = order.Status;

        var grillReady = await OrderStatusHandler(grill).Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Ready }, CancellationToken.None);

        Assert.True(grillReady.IsSuccess);
        Assert.Equal(OrderItemStatus.Ready, order.OrderItems.Single(i => i.Product.Name == "Köfte").Status);
        Assert.Equal(OrderItemStatus.Pending, order.OrderItems.Single(i => i.Product.Name == "Künefe").Status);
        Assert.Equal(before, order.Status);

        var dessertReady = await OrderStatusHandler(dessert).Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Ready }, CancellationToken.None);

        Assert.True(dessertReady.IsSuccess);
        Assert.All(order.OrderItems, i => Assert.Equal(OrderItemStatus.Ready, i.Status));
        Assert.Equal(OrderStatus.Ready, order.Status);
    }

    // Mutfak ekranının pasası hazırlanmış ürünleri de listeler: sorgu hazır ürünleri döndürür, kategori süzgeci yine geçerli.
    [Fact]
    public async Task Kitchen_Query_ReturnsReadyItemsOfOwnCategories_ForThePass()
    {
        (Order order, Category izgara, _) = await SeedMixedOrderAsync();
        order.OrderItems.Single(i => i.Product.Name == "Köfte").UpdateStatus(OrderItemStatus.Ready);
        order.OrderItems.Single(i => i.Product.Name == "Künefe").UpdateStatus(OrderItemStatus.Ready);
        await DbContext.SaveChangesAsync();
        FakeCurrentUserService grill = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([izgara.Id]));

        var result = await new GetAllOrdersToKitchenQueryHandler(Db, grill).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        var item = Assert.Single(Assert.Single(result.Value!).OrderItems);
        Assert.Equal("Köfte", item.ProductName);
        Assert.Equal(OrderItemStatus.Ready, item.Status);
    }

    // Pasadaki "Alındı" (Hazır → Servis edildi) ve "Geri al" (Hazır → Bekliyor) ürün ürün gider; kategori dışı ürün reddedilir.
    [Fact]
    public async Task Kitchen_PassActions_ServedAndUndo_AreCategoryGuarded()
    {
        (Order order, Category izgara, _) = await SeedMixedOrderAsync();
        OrderItem kofte = order.OrderItems.Single(i => i.Product.Name == "Köfte");
        OrderItem kunefe = order.OrderItems.Single(i => i.Product.Name == "Künefe");
        kofte.UpdateStatus(OrderItemStatus.Ready);
        kunefe.UpdateStatus(OrderItemStatus.Ready);
        await DbContext.SaveChangesAsync();
        FakeCurrentUserService grill = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([izgara.Id]));
        var handler = new UpdateOrderItemStatusCommandHandler(Db, new FakeTableNotificationService(), grill);

        var undo = await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = kofte.Id, Status = (int)OrderItemStatus.Pending }, CancellationToken.None);
        Assert.True(undo.IsSuccess);
        Assert.Equal(OrderItemStatus.Pending, kofte.Status);

        kofte.UpdateStatus(OrderItemStatus.Ready);
        var served = await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = kofte.Id, Status = (int)OrderItemStatus.Served }, CancellationToken.None);
        var foreign = await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = kunefe.Id, Status = (int)OrderItemStatus.Served }, CancellationToken.None);

        Assert.True(served.IsSuccess);
        Assert.Equal(OrderItemStatus.Served, kofte.Status);
        Assert.False(foreign.IsSuccess);
        Assert.Equal(StaffAccess.CategoryDeniedMessage, foreign.Error);
        Assert.Equal(OrderItemStatus.Ready, kunefe.Status);
    }

    [Fact]
    public async Task Kitchen_WithCategories_CannotCancelWholeOrder()
    {
        (Order order, Category izgara, _) = await SeedMixedOrderAsync();
        FakeCurrentUserService grill = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([izgara.Id]));

        var result = await OrderStatusHandler(grill).Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Cancelled }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.NotEqual(OrderStatus.Cancelled, order.Status);
    }

    [Fact]
    public async Task CreateUser_NewWaiter_GetsOnlyTakeOrdersByDefault()
    {
        await BranchAsync();
        Region salon = await SeedRegionAsync();
        await SeedActorAsync();

        var handler = new CreateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
        var result = await handler.Handle(new CreateUserCommand
        {
            FullName = "Yeni Garson",
            UserName = "yeni",
            PasswordHash = "123456",
            Role = UserRole.Waiter,
            RegionIds = [salon.Id]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserName == "yeni"));
        Assert.True(membership.CanTakeOrders);
        Assert.False(membership.CanTakePayment);
        Assert.False(membership.CanCancelAndDiscount);
        Assert.False(membership.CanTransferAndReserve);
        Assert.Equal([salon.Id], membership.RegionIds);
    }

    [Fact]
    public async Task CreateUser_WithRegionOfAnotherBranch_Fails()
    {
        await BranchAsync();
        Region foreign = await SeedRegionAsync(Guid.NewGuid());
        await SeedActorAsync();

        var handler = new CreateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
        var result = await handler.Handle(new CreateUserCommand
        {
            FullName = "Garson",
            UserName = "garson2",
            PasswordHash = "123456",
            Role = UserRole.Waiter,
            RegionIds = [foreign.Id]
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.UserBranches.Where(ub => ub.UserName == "garson2"));
    }

    [Fact]
    public async Task CreateUser_KitchenWithCategoryOfAnotherBranch_Fails()
    {
        await BranchAsync();
        Category foreign = await SeedCategoryAsync(Guid.NewGuid());
        await SeedActorAsync();

        var handler = new CreateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
        var result = await handler.Handle(new CreateUserCommand
        {
            FullName = "Mutfak",
            UserName = "mutfak2",
            PasswordHash = "123456",
            Role = UserRole.Kitchen,
            CategoryIds = [foreign.Id]
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.UserBranches.Where(ub => ub.UserName == "mutfak2"));
    }

    [Fact]
    public async Task CreateUser_Kitchen_StoresCategories_AndIgnoresRegions()
    {
        await BranchAsync();
        Region salon = await SeedRegionAsync();
        Category izgara = await SeedCategoryAsync();
        await SeedActorAsync();

        var handler = new CreateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
        var result = await handler.Handle(new CreateUserCommand
        {
            FullName = "Izgaraci",
            UserName = "izgara",
            PasswordHash = "123456",
            Role = UserRole.Kitchen,
            RegionIds = [salon.Id],
            CategoryIds = [izgara.Id]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserName == "izgara"));
        Assert.Equal([izgara.Id], membership.CategoryIds);
        Assert.Empty(membership.RegionIds);
    }

    [Fact]
    public async Task UpdateUser_RoleChange_ClearsKitchenCategoriesAndWaiterRegions()
    {
        Region salon = await SeedRegionAsync();
        Category izgara = await SeedCategoryAsync();
        await SeedActorAsync();
        FakeCurrentUserService kitchen = await SeedStaffAsync(UserRole.Kitchen, m => m.SetCategories([izgara.Id]));
        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == kitchen.UserId));

        var toWaiter = await handler.Handle(new UpdateUserCommand
        {
            UserId = kitchen.UserId, FullName = "Personel", UserName = "personel1", Role = UserRole.Waiter,
            RegionIds = [salon.Id], CategoryIds = [izgara.Id]
        }, CancellationToken.None);
        Assert.True(toWaiter.IsSuccess);
        Assert.Empty(membership.CategoryIds);
        Assert.Equal([salon.Id], membership.RegionIds);

        var backToKitchen = await handler.Handle(new UpdateUserCommand
        {
            UserId = kitchen.UserId, FullName = "Personel", UserName = "personel1", Role = UserRole.Kitchen
        }, CancellationToken.None);
        Assert.True(backToKitchen.IsSuccess);
        Assert.Empty(membership.RegionIds);
        Assert.Empty(membership.CategoryIds);
    }

    [Fact]
    public async Task UpdateUser_SetsWaiterPermissions_AndClearsRegionsWhenRoleLeavesWaiter()
    {
        Region salon = await SeedRegionAsync();
        await SeedActorAsync();
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter);
        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);

        var granted = await handler.Handle(new UpdateUserCommand
        {
            UserId = waiter.UserId, FullName = "Personel", UserName = "garson1", Role = UserRole.Waiter,
            RegionIds = [salon.Id], CanTakePayment = true, CanCancelAndDiscount = true
        }, CancellationToken.None);
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == waiter.UserId));
        Assert.True(granted.IsSuccess);
        Assert.True(membership.CanTakeOrders);
        Assert.True(membership.CanTakePayment);
        Assert.True(membership.CanCancelAndDiscount);
        Assert.False(membership.CanTransferAndReserve);
        Assert.Equal([salon.Id], membership.RegionIds);

        var toCashier = await handler.Handle(new UpdateUserCommand
        {
            UserId = waiter.UserId, FullName = "Personel", UserName = "garson1", Role = UserRole.Cashier, RegionIds = [salon.Id]
        }, CancellationToken.None);
        Assert.True(toCashier.IsSuccess);
        Assert.Empty(membership.RegionIds);
    }
}
