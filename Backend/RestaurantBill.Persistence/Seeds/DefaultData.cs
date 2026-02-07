using RestaurantBill.Core;
using RestaurantBill.Infrastructure.Context;

namespace RestaurantBill.Infrastructure.Seeds;

public static class DefaultData
{
    public static void Seed(RestaurantBillDbContext context)
    {

        if (!context.Categories.Any())
        {
            context.Categories.AddRange(
                new Category { Name = "Main Courses" },
                new Category { Name = "Beverages" },
                new Category { Name = "Desserts" }
            );
            context.SaveChanges();
        }

        if (!context.Products.Any())
        {
            var mainCourse = context.Categories.FirstOrDefault(x => x.Name == "Main Courses");
            var beverage = context.Categories.FirstOrDefault(x => x.Name == "Beverages");
            var dessert = context.Categories.FirstOrDefault(x => x.Name == "Desserts");

            context.Products.AddRange(
                new Product { Name = "Grilled Meatballs", Price = 250, CategoryId = mainCourse.Id },
                new Product { Name = "Ayran", Price = 30, CategoryId = beverage.Id }
            );
            context.SaveChanges();
        }

        if (!context.Tables.Any())
        {
            context.Tables.AddRange(
                new Table { Name = "Table-1 (Empty)", Status = TableStatus.Available },
                new Table { Name = "Table-2 (Occupied)", Status = TableStatus.Occupied }
            );
            context.SaveChanges();
        }

        if (!context.Users.Any())
        {
            context.Users.Add(new User { UserName = "admin", PasswordHash = "123", Role = UserRole.Admin, FullName = "Admin" });
            context.SaveChanges();
        }

        if (!context.Orders.Any())
        {
            var table2 = context.Tables.FirstOrDefault(x => x.Name == "Table-2 (Occupied)");
            
            var newOrder = new Order
            {
                TableId = table2.Id,
                Status = OrderStatus.Preparing,
                TotalPrice = 0,
                CreatedAt = DateTime.Now
            };

            context.Orders.Add(newOrder);
            context.SaveChanges();

            var meatballs = context.Products.FirstOrDefault(x => x.Name == "Grilled Meatballs");
            var ayran = context.Products.FirstOrDefault(x => x.Name == "Ayran");

            var item1 = new OrderItem 
            { 
                OrderId = newOrder.Id,
                ProductId = meatballs.Id, 
                Quantity = 2, 
                Price = 250 
            };

            var item2 = new OrderItem 
            { 
                OrderId = newOrder.Id, 
                ProductId = ayran.Id, 
                Quantity = 1, 
                Price = 30 
            };

            context.OrderItems.AddRange(item1, item2);
            
            newOrder.TotalPrice = (250 * 2) + (30 * 1);
            
            context.SaveChanges();
        }
    }
}