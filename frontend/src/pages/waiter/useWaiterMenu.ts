import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { loadWaiterMenu, peekWaiterMenu, type WaiterMenu } from '@/features/products/api/waiterMenuCache';
import { getApiErrorMessage } from '@/lib/apiError';

const EMPTY_MENU: WaiterMenu = { categories: [], products: [], setMenus: [] };

/**
 * Menüyü önbellekten hemen verir, arkada tazeler.
 * loading yalnızca önbellek boşken ilk yüklemede true olur.
 */
export function useWaiterMenu(): { menu: WaiterMenu; loading: boolean } {
    const [menu, setMenu] = useState<WaiterMenu | null>(peekWaiterMenu);

    useEffect(() => {
        let alive = true;
        loadWaiterMenu()
            .then(fresh => { if (alive) setMenu(fresh); })
            .catch(err => {
                // Eski menü ekrandaysa garsonu rahatsız etme; hiç menü yoksa söyle.
                if (alive && !peekWaiterMenu()) toast.error(getApiErrorMessage(err, 'Menü yüklenemedi.'));
                if (alive) setMenu(current => current ?? EMPTY_MENU);
            });
        return () => { alive = false; };
    }, []);

    return { menu: menu ?? EMPTY_MENU, loading: menu === null };
}
