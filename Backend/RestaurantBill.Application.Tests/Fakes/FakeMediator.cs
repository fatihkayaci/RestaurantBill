using MediatR;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeMediator : IMediator
{
    public bool PublishCalled { get; private set; }

    public Task Publish(object notification, CancellationToken cancellationToken = default)
    {
        PublishCalled = true;
        return Task.CompletedTask;
    }

    public Task Publish<TNotification>(TNotification notification, CancellationToken cancellationToken = default)
        where TNotification : INotification
    {
        PublishCalled = true;
        return Task.CompletedTask;
    }

    public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
        => throw new NotImplementedException();

    public Task Send<TRequest>(TRequest request, CancellationToken cancellationToken = default)
        where TRequest : IRequest
        => throw new NotImplementedException();

    public Task<object?> Send(object request, CancellationToken cancellationToken = default)
        => throw new NotImplementedException();

    public IAsyncEnumerable<TResponse> CreateStream<TResponse>(IStreamRequest<TResponse> request, CancellationToken cancellationToken = default)
        => throw new NotImplementedException();

    public IAsyncEnumerable<object?> CreateStream(object request, CancellationToken cancellationToken = default)
        => throw new NotImplementedException();
}
