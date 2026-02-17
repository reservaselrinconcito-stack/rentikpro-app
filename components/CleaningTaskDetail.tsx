import React, { useState, useEffect } from 'react';
import { CleaningTask, CleaningTemplate } from '../types';

interface Props {
    task: CleaningTask;
    templates: CleaningTemplate[];
    onSave: (task: CleaningTask) => void;
    onClose: () => void;
    onReportIssue?: () => void;
}

export const CleaningTaskDetail: React.FC<Props> = ({ task, templates, onSave, onClose, onReportIssue }) => {
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});
    const [notes, setNotes] = useState(task.notes || '');
    const [signature, setSignature] = useState(task.signature_name || '');
    const [templateItems, setTemplateItems] = useState<string[]>([]);

    useEffect(() => {
        // Load checklist state
        if (task.checklist_state_json) {
            try {
                setChecklist(JSON.parse(task.checklist_state_json));
            } catch (e) { }
        }

        // Load template items
        // Heurisitc: if checklist exists, use keys. If not, load from default template.
        // For v1, let's hardcode a default or pick the first template.
        if (templates.length > 0) {
            try {
                const items = JSON.parse(templates[0].items_json);
                setTemplateItems(items);
            } catch (e) {
                setTemplateItems(['Limpieza general', 'Reponer amenities', 'Revisar desperfectos']);
            }
        } else {
            setTemplateItems(['Limpieza general', 'Reponer amenities', 'Revisar desperfectos']);
        }
    }, [task, templates]);

    const toggleItem = (item: string) => {
        setChecklist(prev => ({
            ...prev,
            [item]: !prev[item]
        }));
    };

    const handleComplete = () => {
        if (!signature.trim()) {
            alert("Por favor, firma con tu nombre.");
            return;
        }

        // Check all items?
        const allChecked = templateItems.every(i => checklist[i]);
        if (!allChecked) {
            if (!confirm("No has marcado todos los items. ¿Marcar como completado igualmente?")) return;
        }

        onSave({
            ...task,
            notes,
            checklist_state_json: JSON.stringify(checklist),
            signature_name: signature,
            status: 'DONE',
            completed_at: Date.now(),
            updated_at: Date.now()
        });
    };

    const handleSaveProgress = () => {
        onSave({
            ...task,
            notes,
            checklist_state_json: JSON.stringify(checklist),
            status: 'IN_PROGRESS',
            updated_at: Date.now()
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="font-bold text-lg">Limpieza: {task.due_date}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Status Badge */}
                    <div className="mb-4">
                        <span className={`px-2 py-1 rounded text-sm font-bold ${task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {task.status === 'DONE' ? 'COMPLETADO' : task.status === 'IN_PROGRESS' ? 'EN PROGRESO' : 'PENDIENTE'}
                        </span>
                        {task.completed_at && <span className="text-xs text-gray-500 ml-2"> el {new Date(task.completed_at).toLocaleTimeString()}</span>}
                    </div>

                    {/* Checklist */}
                    <h4 className="font-semibold mb-2">Checklist</h4>
                    <div className="space-y-2 mb-6">
                        {templateItems.map(item => (
                            <label key={item} className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={checklist[item] || false}
                                    onChange={() => toggleItem(item)}
                                    className="h-5 w-5 text-indigo-600 rounded"
                                    disabled={task.status === 'DONE'}
                                />
                                <span className="ml-3 text-gray-700">{item}</span>
                            </label>
                        ))}
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Incidencias</label>
                        <textarea
                            className="w-full border rounded p-2 text-sm"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            disabled={task.status === 'DONE'}
                            placeholder="Todo correcto..."
                        />
                    </div>

                    {/* Signature */}
                    {task.status !== 'DONE' && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Firma (Tu nombre)</label>
                            <input
                                type="text"
                                className="w-full border rounded p-2"
                                value={signature}
                                onChange={e => setSignature(e.target.value)}
                                placeholder="Ej: Ana García"
                            />
                        </div>
                    )}

                    {task.status === 'DONE' && (
                        <div className="mb-6 p-3 bg-gray-50 rounded text-sm text-gray-600">
                            Firmado por: <strong>{task.signature_name}</strong>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-between space-x-3">
                    {onReportIssue && (
                        <button
                            onClick={onReportIssue}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 font-medium"
                        >
                            🚨 Reportar Incidencia
                        </button>
                    )}

                    <div className="flex space-x-3">
                        {task.status !== 'DONE' ? (
                            <>
                                <button
                                    onClick={handleSaveProgress}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Guardar Progreso
                                </button>
                                <button
                                    onClick={handleComplete}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold shadow-sm"
                                >
                                    Marcar Preparado
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                            >
                                Cerrar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
