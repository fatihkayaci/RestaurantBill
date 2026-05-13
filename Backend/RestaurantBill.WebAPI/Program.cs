using RestaurantBill.Business.Mappings;
using RestaurantBill.Infrastructure.Extensions;
using RestaurantBill.WebAPI.Extensions;
using RestaurantBill.WebAPI.Middlewares;
using RestaurantBill.Infrastructure.Hubs;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File("logs/restaurant-log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();
builder.Services.AddSwaggerWithJwt()
                .AddDatabase(builder.Configuration)
                .AddIdentityWithJwt(builder.Configuration)
                .AddRepositories()
                .AddCorsPolicy()
                .AddMediatRWithBehaviors()
                .AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>())
                .AddInfrastructureServices()
                .AddCurrentUserService();
await builder.Services.AddRabbitMQAsync(builder.Configuration);

var app = builder.Build();

app.UseCors("Allow");
app.UseHttpsRedirection();
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseSwagger();
app.UseSwaggerUI();
app.MapHub<KitchenHub>("/kitchen-hub");
app.MapHub<TableHub>("/table-hub");
app.MapHub<CashierHub>("/cashier-hub");

await app.MigrateAndSeedAsync();

app.Run();