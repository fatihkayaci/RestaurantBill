const ROOT_DOMAIN = 'bill.fatihkayaci.com';

export function getTenantSlug(): string | null {
    const hostname = window.location.hostname;
    const suffix = `.${ROOT_DOMAIN}`;

    if (!hostname.endsWith(suffix)) return null;

    const slug = hostname.slice(0, -suffix.length);
    return slug || null;
}
