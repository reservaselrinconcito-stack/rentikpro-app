import React, { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { isTauri } from '../utils/isTauri';
import { DownloadCloud, RefreshCw } from 'lucide-react';

export const AutoUpdater: React.FC = () => {
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (!isTauri()) return;

        let mounted = true;

        const checkForUpdates = async () => {
            if (checking) return;
            setChecking(true);
            try {
                // Check if an update is available based on our endpoint JSON
                const update = await check();
                if (update && update.available && mounted) {

                    toast.message('¡Nueva versión disponible!', {
                        description: `La versión ${update.version} de RentikPro está lista. ¿Deseas descargar e instalar ahora?`,
                        duration: 10000,
                        icon: <DownloadCloud className="w-5 h-5 text-blue-500" />,
                        action: {
                            label: 'Actualizar',
                            onClick: async () => {
                                const toastId = toast.loading('Descargando actualización...', {
                                    icon: <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                                });
                                try {
                                    let downloaded = 0;
                                    let totalLength = 0;

                                    await update.downloadAndInstall((event) => {
                                        switch (event.event) {
                                            case 'Started':
                                                totalLength = event.data.contentLength || 0;
                                                toast.loading(`Descargando...`, { id: toastId });
                                                break;
                                            case 'Progress':
                                                downloaded += event.data.chunkLength;
                                                if (totalLength > 0) {
                                                    const pct = Math.round((downloaded / totalLength) * 100);
                                                    toast.loading(`Descargando actualización (${pct}%)`, { id: toastId });
                                                }
                                                break;
                                            case 'Finished':
                                                toast.success('Descarga completada. Reiniciando RentikPro...', { id: toastId });
                                                break;
                                        }
                                    });
                                    // Once installation is ready, relaunch the app
                                    await relaunch();
                                } catch (e: any) {
                                    toast.error(`Error al actualizar: ${e.message}`, { id: toastId });
                                }
                            }
                        },
                        cancel: {
                            label: 'Más tarde',
                            onClick: () => { }
                        }
                    });
                }
            } catch (err) {
                console.error("Failed to check for updates:", err);
            } finally {
                if (mounted) setChecking(false);
            }
        };

        // Delay checking immediately on boot to avoid blocking UI thread
        const timer = setTimeout(checkForUpdates, 3000);

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, []);

    return null; // Silent component
};
