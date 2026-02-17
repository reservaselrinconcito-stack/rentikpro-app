import React, { useEffect, useState } from 'react';
import { projectManager } from '../services/projectManager';
import { useStore } from '../hooks/useStore';
import { X, RefreshCw, Database } from 'lucide-react';

export const DebugOverlay: React.FC = () => {
    const isDebug = localStorage.getItem('rentik_debug_mode') === 'true';
    const store = useStore();
    const [counts, setCounts] = useState<any>({});
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!isDebug) return;
        loadCounts();
        const interval = setInterval(loadCounts, 5000);
        return () => clearInterval(interval);
    }, [isDebug, store]);

    const loadCounts = async () => {
        if (!projectManager.getStore()) return;
        try {
            const data = await projectManager.getStore().getCounts();
            setCounts(data);
        } catch (e) {
            console.error("Debug load failed", e);
        }
    };

    if (!isDebug || !visible) return null;

    return (
        <div className="fixed bottom-4 left-4 z-[9999] bg-slate-900/90 text-white p-4 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700 text-xs font-mono max-w-xs">
            <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                    <Database size={12} /> DEBUG VIEW
                </h4>
                <div className="flex gap-2">
                    <button onClick={loadCounts} className="hover:text-emerald-400"><RefreshCw size={12} /></button>
                    <button onClick={() => setVisible(false)} className="hover:text-rose-400"><X size={12} /></button>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between"><span>Properties:</span> <span className="font-bold">{counts.properties || 0}</span></div>
                <div className="flex justify-between"><span>Apartments:</span> <span className="font-bold">{counts.apartments || 0}</span></div>
                <div className="flex justify-between"><span>Bookings:</span> <span className="font-bold">{counts.bookings || 0}</span></div>
                <div className="flex justify-between"><span>Travelers:</span> <span className="font-bold">{counts.travelers || 0}</span></div>
                <div className="flex justify-between text-yellow-400"><span>Birthdays:</span> <span className="font-bold">{counts.birthdays || 0}</span></div>
                <div className="flex justify-between text-blue-400"><span>Unread Msgs:</span> <span className="font-bold">{counts.unread_messages || 0}</span></div>
                <div className="flex justify-between"><span>Invoices:</span> <span className="font-bold">{counts.invoices || 0}</span></div>
                <div className="flex justify-between"><span>Expenses:</span> <span className="font-bold">{counts.movements || 0}</span></div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-700">
                    <span>Last Sync:</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        </div>
    );
};
