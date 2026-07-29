using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeCashRegisterRepository : FakeGenericRepository<CashRegister>, ICashRegisterRepository { }
public class FakeCashTransactionRepository : FakeGenericRepository<CashTransaction>, ICashTransactionRepository { }
public class FakeCategoryRepository : FakeGenericRepository<Category>, ICategoryRepository { }
public class FakeMembershipRepository : FakeGenericRepository<Membership>, IMembershipRepository { }
public class FakeOrderItemRepository : FakeGenericRepository<OrderItem>, IOrderItemRepository { }
public class FakeProductRepository : FakeGenericRepository<Product>, IProductRepository { }
public class FakeRegionRepository : FakeGenericRepository<Region>, IRegionRepository { }
public class FakeRestaurantRepository : FakeGenericRepository<Restaurant>, IRestaurantRepository { }
public class FakeTableRepository : FakeGenericRepository<Table>, ITableRepository { }
public class FakeUserRepository : FakeGenericRepository<User>, IUserRepository { }
public class FakeUserRestaurantRepository : FakeGenericRepository<UserRestaurant>, IUserRestaurantRepository { }
public class FakeVerificationCodeRepository : FakeGenericRepository<VerificationCode>, IVerificationCodeRepository { }
