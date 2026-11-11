import { Outlet } from 'react-router-dom';
import RoleShell from '@/components/layout/RoleShell';

export default function KitchenLayout() {
    return (
        <RoleShell
            roleLabel="Mutfak"
            statsSlotId="kitchen-stats-slot"
            statsSlotClassName="hidden md:flex"
            bodyClassName="overflow-hidden flex flex-col"
        >
            <Outlet />
        </RoleShell>
    );
}
