import React, { useState, useEffect } from 'react';
import { IDataStore, MaintenanceIssue, Apartment, MaintenanceStatus, Property } from '../types';
import { MaintenanceIssueDetail } from '../components/MaintenanceIssueDetail';
import { AlertTriangle, CheckCircle, Clock, Home } from 'lucide-react';

interface Props {
    store: IDataStore;
}

export const MaintenancePage: React.FC<Props> = ({ store }) => {
    const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
    const [apartments, setApartments] = useState<Record<string, Apartment>>({});
    const [properties, setProperties] = useState<Record<string, Property>>({});
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<MaintenanceIssue | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const [filterStatus, setFilterStatus] = useState<'OPEN' | 'RESOLVED' | 'ALL'>('OPEN');

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Issues
            let statusQuery = undefined;
            if (filterStatus === 'OPEN') statusQuery = 'OPEN_PENDING'; // Custom logic in store
            if (filterStatus === 'RESOLVED') statusQuery = 'RESOLVED';

            const fetchedIssues = await store.getMaintenanceIssues(statusQuery);
            setIssues(fetchedIssues);

            // 2. Fetch Context
            if (Object.keys(apartments).length === 0) {
                const [apts, props] = await Promise.all([
                    store.getAllApartments(),
                    store.getProperties()
                ]);

                const aptMap: Record<string, Apartment> = {};
                apts.forEach(a => aptMap[a.id] = a);
                setApartments(aptMap);

                const propMap: Record<string, Property> = {};
                props.forEach(p => propMap[p.id] = p);
                setProperties(propMap);
            }
        } catch (e) {
            console.error("Error loading maintenance data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filterStatus]);

    const handleSaveIssue = async (issue: MaintenanceIssue) => {
        await store.saveMaintenanceIssue(issue);
        setSelectedIssue(null);
        setIsCreating(false);
        loadData();
    };

    // Helper New Issue
    const handleCreateNew = () => {
        const newIssue: MaintenanceIssue = {
            id: crypto.randomUUID(),
            apartment_id: Object.keys(apartments)[0] || '',
            title: '',
            description: '',
            priority: 'MEDIUM',
            status: 'OPEN',
            created_at: Date.now(),
            created_by: 'Administrador', // or current user
            updated_at: Date.now() // Mock for type check
        } as any;
        setSelectedIssue(newIssue);
        setIsCreating(true);
    };

    const statusColor = (s: MaintenanceStatus) => {
        switch (s) {
            case 'OPEN': return 'bg-red-100 text-red-800 border-red-200';
            case 'IN_PROGRESS': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100';
        }
    };

    const priorityBadge = (p: string) => {
        const colors: any = { LOW: 'bg-gray-100', MEDIUM: 'bg-blue-100 text-blue-800', HIGH: 'bg-orange-100 text-orange-800', CRITICAL: 'bg-red-600 text-white' };
        return <span className={`text-xs px-2 py-0.5 rounded font-bold ${colors[p] || 'bg-gray-100'}`}>{p}</span>;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" /> Mantenimiento
                        </h1>
                        <p className="text-gray-500 text-sm">Gestión de incidencias y reparaciones</p>
                    </div>
                    <button
                        onClick={handleCreateNew}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 font-bold"
                    >
                        + Nueva Incidencia
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 mb-6 border-b border-gray-200">
                    {['OPEN', 'RESOLVED', 'ALL'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterStatus(tab as any)}
                            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${filterStatus === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'OPEN' ? 'Pendientes' : tab === 'RESOLVED' ? 'Resueltas' : 'Todas'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div>
                ) : issues.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-10 text-center">
                        <p className="text-xl text-gray-400">No hay incidencias en esta vista.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {issues.map(issue => {
                            const apt = apartments[issue.apartment_id];
                            return (
                                <div
                                    key={issue.id}
                                    onClick={() => { setSelectedIssue(issue); setIsCreating(false); }}
                                    className={`bg-white rounded-lg p-4 shadow-sm border border-l-4 cursor-pointer hover:shadow-md transition-all flex justify-between items-center ${issue.priority === 'CRITICAL' ? 'border-l-red-600' :
                                        issue.priority === 'HIGH' ? 'border-l-orange-500' : 'border-l-gray-300'
                                        }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {priorityBadge(issue.priority)}
                                            <span className="font-bold text-gray-800">{issue.title}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <span className="font-medium text-indigo-600 flex items-center gap-1">
                                                <Home size={14} /> {apt ? `${properties[apt.property_id || '']?.name || 'Propiedad ???'} / ${apt.name}` : <span className="text-red-500">⚠️ Sin asignar</span>}
                                            </span>
                                            <span>•</span>
                                            <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                                            {issue.assigned_to && <span className="text-gray-600">• Técnico: {issue.assigned_to}</span>}
                                        </div>
                                    </div>

                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(issue.status)}`}>
                                        {issue.status}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedIssue && (
                <MaintenanceIssueDetail
                    issue={selectedIssue}
                    onSave={handleSaveIssue}
                    onClose={() => setSelectedIssue(null)}
                    isNew={isCreating}
                    allProperties={Object.values(properties)}
                    allApartments={Object.values(apartments)}
                />
            )}
        </div>
    );
};
