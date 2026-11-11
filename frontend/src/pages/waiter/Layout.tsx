import { Outlet } from 'react-router-dom';
import RoleShell from '@/components/layout/RoleShell';

export default function WaiterLayout() {
    return (
        <RoleShell roleLabel="Garson" large className="bg-[#F1ECE4] dark:bg-background" bodyClassName="overflow-auto">
            <Outlet />
        </RoleShell>
    );
}
