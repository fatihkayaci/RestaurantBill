import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, LayoutDashboard, LayoutGrid, Users, UtensilsCrossed } from "lucide-react";

import OverView from "./OverView";
import Menu from "./Menu";
import Staff from "./Staff";
import Tables from "./Tables";

export default function AdminDashboard() {
    type AdminTab = 'overview' | 'menu' | 'users' | 'tables' | 'reports'
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    return (
        <div className="flex flex-col gap-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)}>
                <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="overview" className="gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden sm:inline">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="menu" className="gap-2">
                        <UtensilsCrossed className="h-4 w-4" />
                        <span className="hidden sm:inline">Menu</span>
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Staff</span>
                    </TabsTrigger>
                    <TabsTrigger value="tables" className="gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        <span className="hidden sm:inline">Tables</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Reports</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                    <OverView />
                </TabsContent>

                <TabsContent value="menu" className="space-y-6 mt-6">
                    <Menu />
                </TabsContent>

                <TabsContent value="users" className="space-y-6 mt-6">
                    <Staff />
                </TabsContent>

                <TabsContent value="tables" className="space-y-6 mt-6">
                    <Tables />
                </TabsContent>
                {/* Todo: will add reports */}
            </Tabs>
        </div>
    );
}
