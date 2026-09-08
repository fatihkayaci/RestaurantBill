using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Logout;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, Result>
{
    private readonly IAppDbContext _db;

    public LogoutCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<Result> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        string tokenHash = RefreshTokenHasher.Hash(request.RefreshToken);

        RefreshToken? stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (stored is null)
            return Result.Success();

        stored.Revoke();
        await _db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
