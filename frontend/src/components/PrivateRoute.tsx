import { Navigate } from 'react-router-dom';
import { getRoleFromToken, getRoleHomePath } from '@/lib/auth';

interface Props {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export default function PrivateRoute({ children, allowedRoles }: Props) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" />;
    }

    if (allowedRoles) {
        const role = getRoleFromToken(token);
        if (!role || !allowedRoles.includes(role)) {
            return <Navigate to={getRoleHomePath(role)} replace />;
        }
    }

    return children;
}
