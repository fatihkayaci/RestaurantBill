import { useEffect, useState } from "react";
import type { Restaurant } from "../features/Restaurants/types";
import { restaurantService } from "../api/restaurantService";
import RestaurantSetupForm from "../components/RestaurantSetupForm";
import AdminDashboard from "../components/AdminDashboard";
import { jwtDecode } from "jwt-decode";

export default function AdminPage() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const token = localStorage.getItem("token");
    const decoded: any = token ? jwtDecode(token) : null;
    const restaurantIdFromToken = decoded?.RestaurantId ? parseInt(decoded.RestaurantId) : 0;

    useEffect(() => {
        restaurantService.getRestaurantsByUserId()
            .then(data => setRestaurants(data))
            .catch(() => setRestaurants([]))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return null;

    if (restaurants.length === 0 && restaurantIdFromToken > 0) return <AdminDashboard />;
    if (restaurants.length === 0) return <RestaurantSetupForm />;
    return <AdminDashboard />;
}
