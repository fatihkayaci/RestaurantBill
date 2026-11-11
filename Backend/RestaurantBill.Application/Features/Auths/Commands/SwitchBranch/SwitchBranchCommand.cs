using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.SwitchBranch;

// Seçilen şube için yeni access + refresh token üretir. BranchId null ise Owner "Tümü" (şirket) kapsamına döner.
public class SwitchBranchCommand : IRequest<Result<RefreshTokenResponseDto>>
{
    public Guid? BranchId { get; set; }

    // Controller cookie'den okur; mevcut oturumun RememberMe'si korunur ve eski refresh token iptal edilir.
    public string? CurrentRefreshToken { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
