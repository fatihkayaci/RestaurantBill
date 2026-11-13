export const ROOT_DOMAIN = 'sophram.com';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

export function getTenantSlug(): string | null {
    const hostname = window.location.hostname;
    const suffix = `.${ROOT_DOMAIN}`;

    // Yerelde alt alan adı yok: VITE_DEV_TENANT_SLUG verilirse localhost o restoranın adresi gibi davranır
    // ("/" restoran sitesini açar). Yalnızca geliştirme sunucusunda; production derlemesinde hiç okunmaz.
    if (import.meta.env.DEV && LOCAL_HOSTS.includes(hostname)) {
        const devSlug = import.meta.env.VITE_DEV_TENANT_SLUG as string | undefined;
        return devSlug?.trim() || null;
    }

    if (!hostname.endsWith(suffix)) return null;

    const slug = hostname.slice(0, -suffix.length);
    return slug || null;
}
