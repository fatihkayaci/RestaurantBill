using RestaurantBill.Business.Mappings;
using RestaurantBill.Infrastructure.Extensions;
using RestaurantBill.WebAPI.Extensions;
using RestaurantBill.WebAPI.Middlewares;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File("logs/restaurant-log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddSwaggerWithJwt();
builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddIdentityWithJwt(builder.Configuration);
builder.Services.AddRepositories();
builder.Services.AddCorsPolicy();
builder.Services.AddMediatRWithBehaviors();
builder.Services.AddAutoMapper(typeof(MappingProfile));
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

await app.MigrateAndSeedAsync();

app.Run();