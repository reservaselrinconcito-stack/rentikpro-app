import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { isTauri } from '../utils/isTauri';
import { DownloadCloud } from 'lucide-react';
import { updateService } from '../services/updateService';

/**
 * AutoUpdater — runs a silent background check 3s after app start.
 * Uses updateService singleton so UpdateButton shares the same state.
 */
export const AutoUpdater: React.FC = () => {
    useEffect(() => {
        if (!isTauri()) return;

        const timer = setTimeout(async () => {
            await updateService.checkForUpdates();
            const { state, availableVersion } = updateService.getStatus();
            if (state === 'available' && availableVersion) {
                toast.message('¡Nueva versión disponible!', {
                    description: `RentikPro ${availableVersion} está lista. Usa el botón "Buscar actualización" en el menú lateral para instalarla.`,
                    duration: 8000,
                    icon: <DownloadCloud className="w-5 h-5 text-blue-500" />,
                });
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return null;
};
