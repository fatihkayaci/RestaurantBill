import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, LayoutDashboard, LayoutGrid, Users, UtensilsCrossed, Tag, Wallet, UserCircle } from "lucide-react";

import OverView from "./OverView";
import Menu from "./Menu";
import Staff from "./Staff";
import Tables from "./Tables";
import CategoriesPanel from "./CategoriesPanel";
import CashRegisters from "./CashRegisters";
import Profile from "./Profile";

export default function AdminDashboard() {
    type AdminTab = 'overview' | 'menu' | 'categories' | 'users' | 'tables' | 'cashRegisters' | 'reports' | 'profile'
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    return (
        <div className="flex flex-col gap-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)}>
                <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="overview" className="gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden sm:inline">Genel Bakış</span>
                    </TabsTrigger>
                    <TabsTrigger value="menu" className="gap-2">
                        <UtensilsCrossed className="h-4 w-4" />
                        <span className="hidden sm:inline">Menü</span>
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="gap-2">
                        <Tag className="h-4 w-4" />
                        <span className="hidden sm:inline">Kategoriler</span>
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Personel</span>
                    </TabsTrigger>
                    <TabsTrigger value="tables" className="gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        <span className="hidden sm:inline">Masalar</span>
                    </TabsTrigger>
                    <TabsTrigger value="cashRegisters" className="gap-2">
                        <Wallet className="h-4 w-4" />
                        <span className="hidden sm:inline">Kasalar</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Raporlar</span>
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="gap-2">
                        <UserCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Profil</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                    <OverView />
                </TabsContent>
                <TabsContent value="menu" className="space-y-6 mt-6">
                    <Menu />
                </TabsContent>
                <TabsContent value="categories" className="space-y-6 mt-6">
                    <CategoriesPanel />
                </TabsContent>
                <TabsContent value="users" className="space-y-6 mt-6">
                    <Staff />
                </TabsContent>
                <TabsContent value="tables" className="space-y-6 mt-6">
                    <Tables />
                </TabsContent>
                <TabsContent value="cashRegisters" className="space-y-6 mt-6">
                    <CashRegisters />
                </TabsContent>
                <TabsContent value="profile" className="space-y-6 mt-6">
                    <Profile />
                </TabsContent>
                {/* Todo: will add reports */}
            </Tabs>
        </div>
    );
}
