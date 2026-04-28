import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}