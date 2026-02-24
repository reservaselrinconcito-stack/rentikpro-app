import React, { useState, useEffect } from 'react';
import { IDataStore, CleaningTask, CleaningTemplate, Apartment, MaintenanceIssue, Property } from '../types';
import { CleaningService } from '../services/cleaningService';
import { CleaningTaskDetail } from '../components/CleaningTaskDetail';
import { MaintenanceIssueDetail } from '../components/MaintenanceIssueDetail';

interface Props {
    store: IDataStore;
}

export const CleaningPage: React.FC<Props> = ({ store }) => {
    const [tasks, setTasks] = useState<CleaningTask[]>([]);
    const [apartments, setApartments] = useState<Record<string, Apartment>>({});
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
    const [templates, setTemplates] = useState<CleaningTemplate[]>([]);

    const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today');
    const [newMaintenanceIssue, setNewMaintenanceIssue] = useState<MaintenanceIssue | null>(null);

    const cleaningService = new CleaningService(store);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Generate tasks for Today and next 7 days
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

            // Auto-generate for today? Or should this be triggered by cron/dashboard?
            // Trigger it here for v1 "on view"
            await cleaningService.generateDailyTasks(today);

            // Fetch Context (FIXED)
            if (Object.keys(apartments).length === 0) {
                const [apts, tmpls, props] = await Promise.all([
                    store.getAllApartments(),
                    store.getCleaningTemplates(),
                    store.getProperties()
                ]);
                const map: Record<string, Apartment> = {};
                apts.forEach(a => map[a.id] = a);
                setApartments(map);
                setTemplates(tmpls);
                setProperties(props);
            }

            // 2. Fetch Tasks
            let start = today;
            let end = today;

            if (filter === 'upcoming') {
                start = today;
                end = nextWeek;
            } else if (filter === 'all') {
                start = '2020-01-01'; // arbitrary past
                end = '2030-01-01';
            }

            const fetchedTasks = await cleaningService.getTasksForRange(start, end);
            setTasks(fetchedTasks);

            // 3. Fetch Context (Apartments, Templates, Properties)
            if (Object.keys(apartments).length === 0) {
                const [apts, tmpls, props] = await Promise.all([
                    store.getAllApartments(),
                    store.getCleaningTemplates(),
                    store.getProperties()
                ]);
                const map: Record<string, Apartment> = {};
                apts.forEach(a => map[a.id] = a);
                setApartments(map);
                setTemplates(tmpls);
                setProperties(props);
            }

        } catch (e) {
            console.error("Error loading cleaning data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filter]);

    const handleTaskSave = async (updatedTask: CleaningTask) => {
        await store.saveCleaningTask(updatedTask);
        setSelectedTask(null);
        loadData(); // Refresh
    };

    const handleReportIssueFromTask = (task: CleaningTask) => {
        const issue: MaintenanceIssue = {
            id: crypto.randomUUID(),
            apartment_id: task.apartment_id,
            title: `Incidencia en limpieza (${task.due_date})`,
            description: '',
            priority: 'MEDIUM',
            status: 'OPEN',
            created_at: Date.now(),
            created_by: 'Limpieza',
            updated_at: Date.now()
        } as any;
        setNewMaintenanceIssue(issue);
    };

    const handleSaveIssue = async (issue: MaintenanceIssue) => {
        await store.saveMaintenanceIssue(issue);
        setNewMaintenanceIssue(null);
        setSelectedTask(null); // Close task detail too
        alert("¡Incidencia reportada correctamente!");
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Limpiezas 🧹</h1>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setFilter('today')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'today' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'upcoming' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                        >
                            Próximos 7 días
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                        >
                            Histórico
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando tareas...</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-10 text-center">
                        <p className="text-xl text-gray-400">No hay tareas pendientes en este rango.</p>
                        <p className="text-sm text-gray-400 mt-2">Las tareas se generan automáticamente al finalizar reservas.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tasks.map(task => {
                            const apt = apartments[task.apartment_id];
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className={`bg-white rounded-xl p-4 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow ${task.status === 'DONE' ? 'border-green-500' :
                                        task.notes?.includes('URGENTE') ? 'border-red-500' : 'border-blue-500'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-800 truncate" title={apt?.name}>{apt?.name || 'Apartamento...'}</span>
                                        {task.status === 'DONE' && <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">HECHO</span>}
                                    </div>

                                    <div className="text-sm text-gray-500 mb-3">
                                        Salida: <span className="font-medium text-gray-900">{task.due_date}</span>
                                    </div>

                                    {task.notes && (
                                        <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded mb-2 font-medium">
                                            {task.notes}
                                        </div>
                                    )}

                                    <button className="w-full mt-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded">
                                        Abrir Checklist
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedTask && (
                <CleaningTaskDetail
                    task={selectedTask}
                    templates={templates}
                    onSave={handleTaskSave}
                    onClose={() => setSelectedTask(null)}
                    onReportIssue={() => handleReportIssueFromTask(selectedTask)}
                />
            )}

            {newMaintenanceIssue && (
                <MaintenanceIssueDetail
                    issue={newMaintenanceIssue}
                    onSave={handleSaveIssue}
                    onClose={() => setNewMaintenanceIssue(null)}
                    isNew={true}
                    allProperties={properties}
                    allApartments={Object.values(apartments)}
                />
            )}
        </div>
    );
};
