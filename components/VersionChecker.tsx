
import React, { useEffect, useRef } from 'react';
import { APP_VERSION } from '../src/version';
import { toast } from 'sonner';

/**
 * Compares two semver strings (e.g., "2.1.8" vs "2.1.5").
 * Returns true if remote > current.
 */
const isNewerVersion = (remote: string, current: string): boolean => {
    const r = remote.split('.').map(v => parseInt(v, 10) || 0);
    const c = current.split('.').map(v => parseInt(v, 10) || 0);

    for (let i = 0; i < Math.max(r.length, c.length); i++) {
        const v1 = r[i] || 0;
        const v2 = c[i] || 0;
        if (v1 > v2) return true;
        if (v1 < v2) return false;
    }
    return false;
};

const isDev = () => {
    const hostname = window.location.hostname;
    return (
        hostname === 'localhost' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.endsWith('.local')
    );
};

export const VersionChecker: React.FC = () => {
    const notifiedRef = useRef(false);

    useEffect(() => {
        // Skip in development
        if (isDev()) {
            console.log("[VersionChecker] Development mode detected, skipping version check UI.");
            return;
        }

        const checkVersion = async () => {
            try {
                const res = await fetch(`/version.json?t=${Date.now()}`);
                if (!res.ok) return;

                const data = await res.json();
                const serverVersion = data.version;

                if (serverVersion && isNewerVersion(serverVersion, APP_VERSION)) {
                    if (!notifiedRef.current) {
                        console.log(`New version detected: ${serverVersion} (Current: ${APP_VERSION})`);
                        notifiedRef.current = true;

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

