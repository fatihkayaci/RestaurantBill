import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from './Header';
import RestaurantSetupForm from './RestaurantSetupForm';
import { restaurantService } from '../api/restaurantService';

export default function MainLayout() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    restaurantService.getMyRestaurant()
      .then(restaurant => {
        setRestaurantName(restaurant.name);
        setNeedsSetup(!restaurant.name);
      })
      .catch(() => setNeedsSetup(false));
  }, []);

  if (needsSetup === null) return null;

  if (needsSetup) return <RestaurantSetupForm onComplete={(name) => { setRestaurantName(name); setNeedsSetup(false); }} />;

  return (
    <div className="min-h-screen bg-background">
      <Header restaurantName={restaurantName} />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}