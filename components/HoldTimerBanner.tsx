import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useStore } from '../services/sqliteStore'; // Assuming generic hook
// In real app, we might need to pass the hold object or fetch it contextually.

interface Props {
    expiresAt: number;
    onExpire: () => void;
}

export const HoldTimerBanner: React.FC<Props> = ({ expiresAt, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const diff = expiresAt - Date.now();
            if (diff <= 0) {
                setTimeLeft(0);
                onExpire();
                clearInterval(interval);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpire]);

    if (timeLeft <= 0) return null;

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    return (
        <div className="bg-orange-50 border-b border-orange-100 p-2 flex justify-center items-center gap-2 text-sm text-orange-800 font-medium">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>
                Su reserva está bloqueada temporalmente. Tiempo restante:
                <span className="font-bold ml-1">{minutes}:{seconds.toString().padStart(2, '0')}</span>
            </span>
        </div>
    );
};
