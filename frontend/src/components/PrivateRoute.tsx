import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { getRoleFromToken, getRoleHomePath } from '@/lib/auth';

interface Props {
    children: React.ReactNode;
    allowedRoles?: string[];
}

function isTransitionToken(token: string): boolean {
    try {
        const decoded: Record<string, string> = jwtDecode(token);
        return !decoded["RestaurantId"];
    } catch {
        return false;
    }
}

export default function PrivateRoute({ children, allowedRoles }: Props) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" />;
    }

    if (isTransitionToken(token)) {
        return <Navigate to="/verify-phone" replace />;
    }

    if (allowedRoles) {
        const role = getRoleFromToken(token);
        if (!role || !allowedRoles.includes(role)) {
            return <Navigate to={getRoleHomePath(role)} replace />;
        }
    }

    return children;
}
