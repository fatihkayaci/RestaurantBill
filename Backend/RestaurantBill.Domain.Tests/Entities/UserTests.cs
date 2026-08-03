using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class UserTests
{
    public class Create
    {
        [Fact]
        public void WithValidParameters_ReturnsUser()
        {
            User user = User.Create("Fatih Kayacı", "f@mail.com", "05001234567");

            Assert.Equal("Fatih Kayacı", user.FullName);
            Assert.Equal("f@mail.com", user.Email);
            Assert.Equal("05001234567", user.PhoneNumber);
        }
        [Fact]
        public void WithEmptyEmailAndPhone_Succeeds()
        {
            User user = User.Create("Fatih", "", "");

            Assert.Equal(string.Empty, user.Email);
            Assert.Equal(string.Empty, user.PhoneNumber);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyFullName_ThrowsDomainException(string invalidName)
        {
            Assert.Throws<DomainException>(() =>
                User.Create(invalidName, "", ""));
        }
    }

    public class Update
    {
        [Fact]
        public void WithValidParameters_UpdatesFields()
        {
            User user = User.Create("Eski Ad", "", "");

            user.Update("Yeni Ad", "y@mail.com", "05009999999", false);

            Assert.Equal("Yeni Ad", user.FullName);
            Assert.Equal("y@mail.com", user.Email);
            Assert.Equal("05009999999", user.PhoneNumber);
            Assert.False(user.IsActive);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void WithEmptyFullName_ThrowsDomainException(string invalidName)
        {
            User user = User.Create("Fatih", "", "");

            Assert.Throws<DomainException>(() =>
                user.Update(invalidName, "", "", true));
        }
    }

    public class SetPasswordHash
    {
        [Fact]
        public void SetsPasswordHash()
        {
            User user = User.Create("Fatih", "", "");

            user.SetPasswordHash("hashed_password_123");

            Assert.Equal("hashed_password_123", user.PasswordHash);
        }
    }
}
