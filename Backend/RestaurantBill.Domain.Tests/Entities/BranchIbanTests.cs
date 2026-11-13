using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Tests.Entities;

public class BranchIbanTests
{
    private const string ValidIban = "TR330006100519786457841326";

    [Theory]
    [InlineData(ValidIban)]
    [InlineData("TR33 0006 1005 1978 6457 8413 26")]
    [InlineData("tr330006100519786457841326")]
    public void IsValid_AcceptsValidTurkishIban_InAnyFormatting(string iban)
    {
        Assert.True(TurkishIban.IsValid(iban));
    }

    [Theory]
    [InlineData("")]
    [InlineData("TR33000610051978645784132")]    // 25 karakter
    [InlineData("TR3300061005197864578413261")]  // 27 karakter
    [InlineData("DE89370400440532013000")]       // geçerli ama Türkiye değil
    [InlineData("TR340006100519786457841326")]   // kontrol hanesi yanlış (mod-97)
    [InlineData("TR33000610051978645784132A")]   // harf
    public void IsValid_RejectsInvalidIban(string iban)
    {
        Assert.False(TurkishIban.IsValid(iban));
    }

    [Fact]
    public void Format_GroupsByFour()
    {
        Assert.Equal("TR33 0006 1005 1978 6457 8413 26", TurkishIban.Format(ValidIban));
    }

    [Fact]
    public void SetIban_NormalizesAndStores()
    {
        Branch branch = Branch.Create("Merkez");
        branch.SetIban("tr33 0006 1005 1978 6457 8413 26", "  Ocak Gıda Ltd.  ");

        Assert.Equal(ValidIban, branch.Iban);
        Assert.Equal("Ocak Gıda Ltd.", branch.IbanHolderName);
        Assert.True(branch.HasIban);
    }

    [Fact]
    public void SetIban_WithBothEmpty_Clears()
    {
        Branch branch = Branch.Create("Merkez");
        branch.SetIban(ValidIban, "Ocak");
        branch.SetIban("", " ");

        Assert.False(branch.HasIban);
        Assert.Equal(string.Empty, branch.IbanHolderName);
    }

    [Fact]
    public void SetIban_InvalidOrMissingHolder_Throws()
    {
        Branch branch = Branch.Create("Merkez");
        Assert.Throws<DomainException>(() => branch.SetIban("TR340006100519786457841326", "Ocak"));
        Assert.Throws<DomainException>(() => branch.SetIban(ValidIban, ""));
    }
}
