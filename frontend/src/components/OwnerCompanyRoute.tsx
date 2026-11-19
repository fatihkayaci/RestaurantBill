import { Navigate, useLocation } from 'react-router-dom';
import { getHomePathFromToken, getSession } from '@/lib/auth';
import { isSingleBranchOwner, useMyBranches } from '@/features/branches/useMyBranches';

// /owner altındaki şirket sayfaları. Çok şubeli sahipte yalnız "Tümü" modunda açılır (şube seçiliyken ana sayfaya döner).
// Tek şubeli sahipte "Tümü" ayrımı yoktur: sahip şube kapsamında çalışır ve şirket sayfaları da oradan açılır.
// Şube panelinde karşılığı olan sayfalar (/admin/overview, /admin/admins, …) oraya yönlenir; karşılığı olmayan
// Restoran sitesi ve Verileri sil /owner altında açılır. Backend bu uçlarda yalnız sahibi ve kendi şirketini kabul eder
// (CompanyId claim'i + OwnerUserId), kapsamdan bağımsız.
const OWNER_ONLY_PAGES = new Set(['/owner/site', '/owner/data']);

// /owner/overview → /admin/overview gibi; Şirket Genel Bakış'ın yerini tek şubede şubenin Genel Bakış'ı alır.
function branchPathForOwnerPage(pathname: string): string | null {
    const path = pathname.replace(/\/+$/, '');
    if (OWNER_ONLY_PAGES.has(path)) return null;
    const rest = path.slice('/owner'.length);
    return rest === '' ? '/admin/overview' : `/admin${rest}`;
}

export default function OwnerCompanyRoute({ children }: { children: React.ReactNode }) {
    const { pathname, search } = useLocation();
    const session = getSession();
    const branches = useMyBranches();

    if (!session || session.role !== 'Owner') return <Navigate to={getHomePathFromToken()} replace />;
    if (session.isCompanyScope) return children;

    // Şube kapsamındaki sahip: şube sayısı bilinmeden karar verilemez.
    if (branches === null) return null;
    if (!isSingleBranchOwner(session.role, branches)) return <Navigate to={getHomePathFromToken()} replace />;

    const target = branchPathForOwnerPage(pathname);
    return target ? <Navigate to={`${target}${search}`} replace /> : children;
}
