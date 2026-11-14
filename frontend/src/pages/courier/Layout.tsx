import { Outlet } from 'react-router-dom';
import RoleShell from '@/components/layout/RoleShell';

export default function CourierLayout() {
    return (
        <RoleShell roleLabel="Kurye" large>
            <Outlet />
        </RoleShell>
    );
}
