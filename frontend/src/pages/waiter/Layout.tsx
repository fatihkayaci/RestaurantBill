import { Outlet } from 'react-router-dom';
import RoleShell from '@/components/layout/RoleShell';

// Ekran yüksekliğine sabitlenir: masa ızgarası, paneller ve alt sekme çubuğu kendi içinde kayar.
export default function WaiterLayout() {
    return (
        <RoleShell
            roleLabel="Garson"
            large
            className="h-dvh min-h-0 bg-[#F1ECE4] dark:bg-background"
            bodyClassName="flex min-h-0 flex-col overflow-hidden"
        >
            <Outlet />
        </RoleShell>
    );
}
