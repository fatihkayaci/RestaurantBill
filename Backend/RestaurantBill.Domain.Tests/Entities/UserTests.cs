using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class UserTests
{
    public class Create
    {
        [Fact]
        public void WithValidParameters_ReturnsUser()
        {
            User user = User.Create("Fatih Kayacı", "fatih", "f@mail.com", "05001234567", "USR01", UserRole.Admin, restaurantId: 1);

            Assert.Equal("Fatih Kayacı", user.FullName);
            Assert.Equal("fatih", user.UserName);
            Assert.Equal("f@mail.com", user.Email);
            Assert.Equal("05001234567", user.PhoneNumber);
            Assert.Equal("USR01", user.UserCode);
            Assert.Equal(UserRole.Admin, user.Role);
            Assert.Equal(1, user.RestaurantId);
        }
        [Fact]
        public void WithNullEmailAndPhone_Succeeds()
        {
            User user = User.Create("Fatih", "fatih", null, null, "USR01", UserRole.Admin, restaurantId: 1);

            Assert.Null(user.Email);
            Assert.Null(user.PhoneNumber);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyFullName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                User.Create(invalidName, "fatih", null, null, "USR01", UserRole.Admin, restaurantId: 1));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyUserName_ThrowsDomainException(string invalidUserName)
        {
            Assert.Throws<DomainException>(() =>
                User.Create("Fatih", invalidUserName, null, null, "USR01", UserRole.Admin, restaurantId: 1));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyUserCode_ThrowsDomainException(string invalidCode)
        {
            Assert.Throws<DomainException>(() =>
                User.Create("Fatih", "fatih", null, null, invalidCode, UserRole.Admin, restaurantId: 1));
        }
    }

    public class Update
    {
        [Fact]
        public void WithValidParameters_UpdatesFields()
        {
            User user = User.Create("Eski Ad", "eski", null, null, "OLD01", UserRole.Admin, restaurantId: 1);

            user.Update("Yeni Ad", "yeni", "y@mail.com", "05009999999", "NEW01", UserRole.Waiter);

            Assert.Equal("Yeni Ad", user.FullName);
            Assert.Equal("yeni", user.UserName);
            Assert.Equal("y@mail.com", user.Email);
            Assert.Equal("05009999999", user.PhoneNumber);
            Assert.Equal("NEW01", user.UserCode);
            Assert.Equal(UserRole.Waiter, user.Role);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyFullName_ThrowsDomainException(string invalidName)
        {
            User user = User.Create("Fatih", "fatih", null, null, "USR01", UserRole.Admin, restaurantId: 1);

            Assert.Throws<DomainException>(() =>
                user.Update(invalidName, "fatih", null, null, "USR01", UserRole.Admin));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyUserName_ThrowsDomainException(string invalidUserName)
        {
            User user = User.Create("Fatih", "fatih", null, null, "USR01", UserRole.Admin, restaurantId: 1);

            Assert.Throws<DomainException>(() =>
                user.Update("Fatih", invalidUserName, null, null, "USR01", UserRole.Admin));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyUserCode_ThrowsDomainException(string invalidCode)
        {
            User user = User.Create("Fatih", "fatih", null, null, "USR01", UserRole.Admin, restaurantId: 1);

            Assert.Throws<DomainException>(() =>
                user.Update("Fatih", "fatih", null, null, invalidCode, UserRole.Admin));
        }
    }

    public class SetPasswordHash
    {
        [Fact]
        public void SetsPasswordHash()
        {
            User user = User.Create("Fatih", "fatih", null, null, "USR01", UserRole.Admin, restaurantId: 1);

            user.SetPasswordHash("hashed_password_123");

            Assert.Equal("hashed_password_123", user.PasswordHash);
        }
    }
}
