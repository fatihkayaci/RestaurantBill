using FluentValidation;
using FluentValidation.AspNetCore;
using MediatR;
using RestaurantBill.Application.Behaviors;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Validators.OrderItem;

namespace RestaurantBill.WebAPI.Extensions;

public static class MediatRExtensions
{
    public static IServiceCollection AddMediatRWithBehaviors(this IServiceCollection services)
    {
        services.AddFluentValidationAutoValidation();
        services.AddValidatorsFromAssemblyContaining<RemoveOrderItemDtoValidator>();

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssemblyContaining<CreateOrderCommand>();
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        return services;
    }
}
