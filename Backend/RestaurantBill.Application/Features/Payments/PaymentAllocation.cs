namespace RestaurantBill.Application.Features.Payments;

/// <summary>
/// Ödemeleri KDV oranlarına dağıtır. Bir ödeme işlemi oran başına bir Payment satırı yazar; vergi raporu
/// oran başına toplamları bu satırlardan alır. Tutar girerek alınan (hesaba) ödemeler o anki kalan hesabın
/// oranlarına orantılı dağıtılır; kapanış ödemesi her orandan, o orana daha önce yazılmış tutarı düşer.
/// Böylece bir hesabın oran başına toplamı, kaç parçada ödenirse ödensin ürünlerin gerçek KDV dağılımına eşit olur.
/// </summary>
public static class PaymentAllocation
{
    /// <summary>
    /// <paramref name="amount"/>'u ağırlıklara orantılı, kuruşa yuvarlayarak böler; yuvarlama farkı en büyük
    /// ağırlığa yazılır, toplam her zaman tam <paramref name="amount"/> olur. Ağırlığı 0 olan anahtar 0 alır.
    /// </summary>
    public static Dictionary<decimal, decimal> Split(decimal amount, IReadOnlyDictionary<decimal, decimal> weights)
    {
        Dictionary<decimal, decimal> result = weights.Keys.ToDictionary(k => k, _ => 0m);
        List<KeyValuePair<decimal, decimal>> positive = weights.Where(kv => kv.Value > 0).ToList();
        if (amount == 0m || positive.Count == 0)
            return result;

        decimal totalWeight = positive.Sum(kv => kv.Value);
        decimal largest = positive.OrderByDescending(kv => kv.Value).ThenBy(kv => kv.Key).First().Key;

        decimal allocated = 0m;
        foreach ((decimal key, decimal weight) in positive)
        {
            if (key == largest)
                continue;
            decimal share = Math.Round(amount * weight / totalWeight, 2, MidpointRounding.AwayFromZero);
            result[key] = share;
            allocated += share;
        }
        result[largest] = amount - allocated;

        // Çok küçük tutarlarda yukarı yuvarlanan paylar toplamı aşabilir; o durumda tamamı en büyüğe yazılır.
        if (result[largest] < 0m)
        {
            foreach (decimal key in result.Keys.ToList())
                result[key] = 0m;
            result[largest] = amount;
        }

        return result;
    }

    /// <summary>
    /// Kalan ürünlerin oran başına brütünden, daha önce hesaba alınmış ödemelerin oran başına düşülecek payını
    /// hesaplar. Bir oranın hesaba ödemesi o oranın brütünü aşıyorsa (ödemeden sonra o orandaki ürünler iptal
    /// edildiyse) fazlası, kalan payı olan oranlara orantılı kaydırılır.
    /// </summary>
    public static Dictionary<decimal, decimal> CreditByRate(
        IReadOnlyDictionary<decimal, decimal> grossByRate,
        IReadOnlyDictionary<decimal, decimal> paidOnAccountByRate)
    {
        Dictionary<decimal, decimal> credit = [];
        decimal excess = 0m;

        foreach ((decimal rate, decimal gross) in grossByRate)
        {
            decimal paid = paidOnAccountByRate.GetValueOrDefault(rate);
            decimal applied = Math.Min(paid, gross);
            credit[rate] = applied;
            excess += paid - applied;
        }

        foreach ((decimal rate, decimal paid) in paidOnAccountByRate)
        {
            if (!grossByRate.ContainsKey(rate))
                excess += paid;
        }

        if (excess > 0m)
        {
            Dictionary<decimal, decimal> headroom = grossByRate.ToDictionary(kv => kv.Key, kv => kv.Value - credit[kv.Key]);
            foreach ((decimal rate, decimal extra) in Split(excess, headroom))
                credit[rate] += extra;
        }

        return credit;
    }

    /// <summary>KDV dahil tutarın matrahı (kuruşa yuvarlı); KDV = tutar - matrah.</summary>
    public static (decimal Matrah, decimal Tax) SplitTax(decimal grossAmount, decimal taxRate)
    {
        decimal matrah = Math.Round(grossAmount / (1 + taxRate / 100m), 2, MidpointRounding.AwayFromZero);
        return (matrah, grossAmount - matrah);
    }
}
