import { Navigate } from 'react-router-dom';
import { getHomePathFromToken, getSession } from '@/lib/auth';

interface Props {
    children: React.ReactNode;
    allowedRoles?: string[];
    // Owner için: "company" yalnızca Tümü modunda, "branch" yalnızca bir şube seçiliyken açılır.
    // Diğer roller her zaman şube kapsamındadır; onlar için bu kontrol uygulanmaz.
    scope?: 'company' | 'branch';
}

export default function PrivateRoute({ children, allowedRoles, scope }: Props) {
    const token = localStorage.getItem('token');
    const session = getSession(token);

    if (!token || !session) {
        return <Navigate to="/login" />;
    }

    if (allowedRoles && (!session.role || !allowedRoles.includes(session.role))) {
        return <Navigate to={getHomePathFromToken(token)} replace />;
    }

    if (scope && session.role === 'Owner') {
        const inCompanyScope = session.isCompanyScope;
        if ((scope === 'company') !== inCompanyScope) {
            return <Navigate to={getHomePathFromToken(token)} replace />;
        }
    }

    return children;
}
