
import React, { useEffect } from 'react';
import { APP_VERSION } from '../src/version';
import { toast } from 'sonner';

export const VersionChecker: React.FC = () => {
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const res = await fetch(`/version.json?t=${Date.now()}`);
                if (!res.ok) return;

                const data = await res.json();
                const serverVersion = data.version;

                if (serverVersion && serverVersion !== APP_VERSION) {
                    console.log(`New version detected: ${serverVersion} (Current: ${APP_VERSION})`);

                    toast("Nueva versión disponible", {
                        description: `Se ha detectado la versión ${serverVersion}. Recarga para actualizar.`,
                        action: {
                            label: "Recargar",
                            onClick: () => window.location.reload()
                        },
                        duration: Infinity, // Stay until clicked
                        position: 'top-right'
                    });
                }
            } catch (e) {
                // Silent fail
            }
        };

        // Check on mount
        checkVersion();

        // Check every 5 minutes
        const interval = setInterval(checkVersion, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return null; // Headless component
};
