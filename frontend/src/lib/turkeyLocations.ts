export interface District {
    id: number;
    name: string;
}

export interface Province {
    name: string;
    districts: District[];
}

let provincesPromise: Promise<Province[]> | null = null;

export const getTurkeyProvinces = (): Promise<Province[]> => {
    if (!provincesPromise) {
        provincesPromise = fetch('https://api.turkiyeapi.dev/v1/provinces?fields=name,districts')
            .then(res => res.json())
            .then((json: { data?: Province[] }) => json.data ?? [])
            .catch(err => {
                provincesPromise = null;
                throw err;
            });
    }
    return provincesPromise;
};
