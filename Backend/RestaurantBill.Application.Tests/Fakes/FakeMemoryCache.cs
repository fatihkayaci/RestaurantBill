using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeMemoryCache : IMemoryCache
{
    private readonly Dictionary<object, object?> _store = new();

    public bool TryGetValue(object key, out object? value) => _store.TryGetValue(key, out value);
    public void Remove(object key) => _store.Remove(key);

    public ICacheEntry CreateEntry(object key) => throw new NotImplementedException();
    public void Dispose() { }
}
