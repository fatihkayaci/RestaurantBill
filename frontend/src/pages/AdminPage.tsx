import { useEffect, useState } from "react";
import type { Restaurant } from "../features/Restaurants/types";
import { restaurantService } from "../api/restaurantService";
import RestaurantSetupForm from "../components/RestaurantSetupForm";
import AdminDashboard from "../components/AdminDashboard";

export default function AdminPage() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        
        restaurantService.getRestaurantsByUserId()
            .then(data => setRestaurants(data))
            .catch(() => setRestaurants([]));
    }, []);
    
    if (restaurants.length === 0) return <RestaurantSetupForm />;
    return <AdminDashboard />;
    
}
