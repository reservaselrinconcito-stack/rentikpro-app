import React, { useState } from 'react';
import { MaintenanceIssue, MaintenancePriority, MaintenanceStatus, Property, Apartment } from '../types';
import { Home, Building2 } from 'lucide-react';

interface Props {
    issue: MaintenanceIssue;
    onSave: (issue: MaintenanceIssue) => void;
    onClose: () => void;
    isNew?: boolean;
    allProperties?: Property[];
    allApartments?: Apartment[];
}

export const MaintenanceIssueDetail: React.FC<Props> = ({ issue, onSave, onClose, isNew = false, allProperties = [], allApartments = [] }) => {
    const [title, setTitle] = useState(issue.title || '');
    const [description, setDescription] = useState(issue.description || '');
    const [priority, setPriority] = useState<MaintenancePriority>(issue.priority || 'MEDIUM');
    const [status, setStatus] = useState<MaintenanceStatus>(issue.status || 'OPEN');
    const [assignedTo, setAssignedTo] = useState(issue.assigned_to || '');

    // Assignment Context (FIXED)
    const initialApt = allApartments.find(a => a.id === issue.apartment_id);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialApt?.property_id || '');
    const [selectedApartmentId, setSelectedApartmentId] = useState<string>(issue.apartment_id || '');

    // Resolution
    const [resolutionNotes, setResolutionNotes] = useState(issue.resolution_notes || '');
    const [signature, setSignature] = useState(issue.signature_name || '');

    const handleSave = () => {
        if (!title.trim()) { alert("El título es obligatorio"); return; }
        if (!selectedApartmentId) { alert("Debes seleccionar un apartamento para la incidencia"); return; }

        // If resolving, require signature
        if (status === 'RESOLVED' && !signature.trim()) {
            alert("Para resolver la incidencia, debes firmar con tu nombre.");
            return;
        }

        const updated: MaintenanceIssue = {
            ...issue,
            title,
            description,
            priority,
            status,
            apartment_id: selectedApartmentId,
            assigned_to: assignedTo,
            resolution_notes: status === 'RESOLVED' ? resolutionNotes : issue.resolution_notes,
            signature_name: status === 'RESOLVED' ? signature : issue.signature_name,
            resolved_at: status === 'RESOLVED' && !issue.resolved_at ? Date.now() : issue.resolved_at,
            created_at: issue.created_at || Date.now(),
            updated_at: Date.now()
        } as any;

        onSave(updated);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className={`p-4 border-b flex justify-between items-center rounded-t-lg ${isNew ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                    <h3 className="font-bold text-lg">{isNew ? 'Nueva Incidencia' : 'Detalle Incidencia'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">

                    {/* Property / Apartment Assignment */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Propiedad</label>
                            <div className="relative">
                                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    className="w-full pl-9 pr-3 py-2 bg-white border rounded-lg text-sm font-medium"
                                    value={selectedPropertyId}
                                    onChange={(e) => {
                                        setSelectedPropertyId(e.target.value);
                                        setSelectedApartmentId(''); // Reset apartment
                                    }}
                                >
                                    <option value="">Seleccionar Propiedad...</option>
                                    {allProperties.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Apartamento</label>
                            <div className="relative">
                                <Home size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    className="w-full pl-9 pr-3 py-2 bg-white border rounded-lg text-sm font-medium"
                                    value={selectedApartmentId}
                                    onChange={(e) => setSelectedApartmentId(e.target.value)}
                                    disabled={!selectedPropertyId}
                                >
                                    <option value="">{selectedPropertyId ? 'Seleccionar Apartamento...' : 'Elige Propiedad primero'}</option>
                                    {allApartments.filter(a => a.property_id === selectedPropertyId).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Title & Priority */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título</label>
                        <input
                            type="text" className="w-full border rounded p-2"
                            value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="Ej: Bombilla fundida en baño"
                            disabled={!isNew && issue.status === 'RESOLVED'}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                            <select
                                className="w-full border rounded p-2"
                                value={priority} onChange={e => setPriority(e.target.value as any)}
                                disabled={issue.status === 'RESOLVED'}
                            >
                                <option value="LOW">Baja</option>
                                <option value="MEDIUM">Media</option>
                                <option value="HIGH">Alta</option>
                                <option value="CRITICAL">Crítica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Estado</label>
                            {isNew ? (
                                <div className="p-2 text-gray-500">Abierta (Automático)</div>
                            ) : (
                                <select
                                    className="w-full border rounded p-2"
                                    value={status} onChange={e => setStatus(e.target.value as any)}
                                >
                                    <option value="OPEN">Abierta</option>
                                    <option value="IN_PROGRESS">En Curso</option>
                                    <option value="RESOLVED">Resuelta</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descripción Detallada</label>
                        <textarea
                            className="w-full border rounded p-2" rows={3}
                            value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Describe el problema..."
                            disabled={issue.status === 'RESOLVED'}
                        />
                    </div>

                    {/* Assignment */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Asignado a</label>
                        <input
                            type="text" className="w-full border rounded p-2"
                            value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                            placeholder="Nombre del técnico (opcional)"
                            disabled={issue.status === 'RESOLVED'}
                        />
                    </div>

                    {/* Resolution Section (Only if solving or solved) */}
                    {(status === 'RESOLVED' || issue.status === 'RESOLVED') && (
                        <div className="border-t pt-4 mt-4 bg-green-50 p-4 rounded -mx-2">
                            <h4 className="font-bold text-green-800 mb-2">Resolución</h4>

                            <div className="mb-2">
                                <label className="block text-sm font-medium text-green-900">Notas de Resolución</label>
                                <textarea
                                    className="w-full border border-green-200 rounded p-2" rows={2}
                                    value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
                                    placeholder="Qué se ha hecho para arreglarlo..."
                                    disabled={issue.status === 'RESOLVED' && !isNew} // Allow editing if we just changed status to resolved
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-green-900">Firma (Obligatoria)</label>
                                <input
                                    type="text" className="w-full border border-green-200 rounded p-2"
                                    value={signature} onChange={e => setSignature(e.target.value)}
                                    placeholder="Tu nombre"
                                    disabled={issue.status === 'RESOLVED' && issue.signature_name}
                                />
                            </div>
                        </div>
                    )}

                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">
                        {isNew ? 'Crear Incidencia' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};
