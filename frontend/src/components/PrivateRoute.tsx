import { Navigate } from 'react-router-dom';

interface Props {
    children: React.ReactNode;
}

export default function PrivateRoute({ children }: Props) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" />;
    }

    return children;
}
