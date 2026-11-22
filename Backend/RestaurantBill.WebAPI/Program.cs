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
                .AddCorsPolicy(builder.Configuration)
                .AddMediatRWithBehaviors()
                .AddInfrastructureServices(builder.Configuration)
                .AddCurrentUserService()
                .AddHealthCheck()
                .AddAuthRateLimiting();

var app = builder.Build();

app.UseCors("Allow");
app.UseHttpsRedirection();
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionMiddleware>();
// Kimlik önce çözülür: "Verileri sil" uçlarının sınırı kullanıcı başınadır (diğer politikalar IP'ye bakar, etkilenmez).
app.UseAuthentication();
app.UseRateLimiter();
app.UseMiddleware<CompanyClosureMiddleware>();
app.UseAuthorization();
app.MapControllers();
// Production'da API yüzeyini dışarı açmamak için Swagger yalnızca Development'ta veya açıkça istendiğinde yayınlanır.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.MapHub<KitchenHub>("/kitchen-hub");
app.MapHub<TableHub>("/table-hub");
app.MapHub<CashierHub>("/cashier-hub");
app.MapHub<CourierHub>("/courier-hub");
// Anonymous customer QR page hub: content-free "your table changed" signals (see PublicTableHub).
app.MapHub<PublicTableHub>("/public-table-hub");
app.MapHealthCheck();

await app.MigrateAndSeedAsync();

app.Run();