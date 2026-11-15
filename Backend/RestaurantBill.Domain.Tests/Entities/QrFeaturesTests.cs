using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Domain.Tests.Entities;

public class QrFeaturesTests
{
    [Fact]
    public void Branch_WithoutSavedFeatures_HasEverythingEnabled()
    {
        Branch branch = Branch.Create("Merkez");

        QrFeatures features = branch.GetQrFeatures();

        Assert.Null(branch.QrFeatures);
        Assert.True(features.OrderingEnabled);
        Assert.True(features.CallWaiterEnabled);
        Assert.True(features.BillRequestEnabled);
        Assert.True(features.DeliveryLinkEnabled);
        Assert.True(features.ReservationLinkEnabled);
    }

    [Fact]
    public void SetQrFeatures_Null_ReturnsToDefaults()
    {
        Branch branch = Branch.Create("Merkez");
        branch.SetQrFeatures(QrFeatures.Create(false, false, false, false, false));
        Assert.False(branch.GetQrFeatures().CallWaiterEnabled);

        branch.SetQrFeatures(null);

        Assert.Same(QrFeatures.Default, branch.GetQrFeatures());
    }
}
