using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetBranchByUserId
{
    public class GetRestaurantByUserIdQueryHandler : IRequestHandler<GetBranchByUserIdQuery, Result<RestaurantDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetRestaurantByUserIdQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }
        /// <summary>
        /// Retrieves the restaurant associated with the currently authenticated user asynchronously.
        /// Uses RestaurantId from claims, which is set for all roles (Admin, Cashier, Waiter, Kitchen).
        /// </summary>
        public async Task<Result<RestaurantDto>> Handle(GetBranchByUserIdQuery request, CancellationToken cancellationToken)
        {
            Guid branchId = _currentUser.BranchId;
            IEnumerable<Branch> branches = await _uow.Branch.GetAllAsync(x => x.Id == branchId, false);
            Branch? branch = branches.FirstOrDefault();
            if (branch is null)
                return Result<RestaurantDto>.Failure("Restoran bulunamadı.");
                
            return Result<RestaurantDto>.Success(branch.ToDto());
        }
    }
}
