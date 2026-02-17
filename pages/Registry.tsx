import React, { useState, useEffect, useCallback } from 'react';
import { projectManager } from '../services/projectManager';
import { Apartment, Property, RegistryUnit, RegistryPresentation, FiscalProfile, Booking } from '../types';
import { generateAnnualXBRL } from '../services/xbrlGenerator';
import { notifyDataChanged, useDataRefresh } from '../services/dataRefresher';
import {
   Landmark, FileCheck, AlertTriangle, FileText, Upload, Download,
   ExternalLink, CheckCircle2, Save, X, Plus, Clock, Search, ShieldCheck, Building2
} from 'lucide-react';

export const Registry: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'UNITS' | 'PRESENTATIONS'>('UNITS');
   const [apartments, setApartments] = useState<Apartment[]>([]);
   const [properties, setProperties] = useState<Property[]>([]);
   const [registryUnits, setRegistryUnits] = useState<RegistryUnit[]>([]);
   const [presentations, setPresentations] = useState<RegistryPresentation[]>([]);
   const [fiscalProfile, setFiscalProfile] = useState<FiscalProfile | null>(null);
   const [bookings, setBookings] = useState<Booking[]>([]);

   // Modals
   const [editingUnit, setEditingUnit] = useState<RegistryUnit | null>(null);
   const [isXBRLModalOpen, setIsXBRLModalOpen] = useState(false);
   const [xbrlYear, setXbrlYear] = useState(new Date().getFullYear() - 1);

   const loadData = useCallback(async () => {
      const store = projectManager.getStore();
      try {
         const [apts, props, bookings, fiscal, presentations] = await Promise.all([
            store.getAllApartments(),
            store.getProperties(),
            store.getBookings(),
            store.getFiscalProfile(),
            store.getPresentations()
         ]);

         setApartments(apts);
         setProperties(props);
         setBookings(bookings);
         setFiscalProfile(fiscal);
         setPresentations(presentations);

         // Cargar o inicializar unidades registrales para cada apartamento
         const units: RegistryUnit[] = [];
         for (const apt of apts) {
            let u = await store.getRegistryUnit(apt.id);
            if (!u) {
               // Crear draft en memoria si no existe
               u = {
                  id: crypto.randomUUID(),
                  apartment_id: apt.id,
                  referencia_catastral: '', licencia_turistica: '', identificador_registral: '',
                  direccion_completa: '', municipio: '', provincia: '', codigo_postal: '',
                  titularidad: 'explotacion', estado_tramitacion: 'pendiente',
                  numero_registro_oficial: '', notas_internas: '',
                  updated_at: Date.now()
               };
            }
            units.push(u);
         }
         setRegistryUnits(units);
      } catch (err) { console.error(err); }
   }, []);

   useEffect(() => { loadData(); }, [loadData]);
   useDataRefresh(loadData);

   const handleSaveUnit = async (u: RegistryUnit) => {
      await projectManager.getStore().saveRegistryUnit(u);
      setEditingUnit(null);
      loadData();
   };

   const handleGenerateXBRL = async () => {
      if (!fiscalProfile) return alert("Falta el Perfil Fiscal para generar el informe.");

      // Generar contenido
      const xmlContent = generateAnnualXBRL({
         year: xbrlYear,
         fiscal: fiscalProfile,
         units: registryUnits,
         bookings: bookings
      });

      // Guardar Presentación
      const pres: RegistryPresentation = {
         id: crypto.randomUUID(),
         registry_unit_id: null, // Global
         tipo_tramite: 'modelo_anual_xbrl',
         ejercicio_fiscal: xbrlYear,
         fecha_presentacion: new Date().toISOString().split('T')[0],
         estado: 'borrador',
         xbrl_blob: btoa(unescape(encodeURIComponent(xmlContent))),
         created_at: Date.now()
      };
      await projectManager.getStore().savePresentation(pres);

      // Descargar fichero
      const blob = new Blob([xmlContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ModeloAnual_${fiscalProfile.nif_cif}_${xbrlYear}.xbrl`;
      a.click();

      setIsXBRLModalOpen(false);
      loadData();
      setActiveTab('PRESENTATIONS');
   };

   const markAsPresented = async (p: RegistryPresentation) => {
      const csv = prompt("Introduce el CSV (Código Seguro de Verificación) del acuse:");
      if (csv) {
         p.estado = 'presentado';
         p.csv_acuse = csv;
         await projectManager.getStore().savePresentation(p);
         loadData();
      }
   };

   return (
      <div className="space-y-8 animate-in fade-in pb-20">
         <div className="flex justify-between items-center">
            <div>
               <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <Landmark className="text-indigo-600" /> Registro & Ventanilla Única
               </h2>
               <p className="text-slate-500">Gestión de obligaciones registrales (RD 1312/2024) y modelos informativos.</p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setActiveTab('UNITS')} className={`px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'UNITS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Unidades Registrales</button>
               <button onClick={() => setActiveTab('PRESENTATIONS')} className={`px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'PRESENTATIONS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Presentaciones</button>
            </div>
         </div>

         {!fiscalProfile && (
            <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex items-start gap-4">
               <AlertTriangle className="text-amber-600 shrink-0 mt-1" />
               <div>
                  <h4 className="font-bold text-amber-800">Perfil Fiscal Incompleto</h4>
                  <p className="text-sm text-amber-700 mt-1">Es necesario configurar los datos fiscales en "Contabilidad &gt; Fiscal" para generar modelos oficiales.</p>
               </div>
            </div>
         )}

         {activeTab === 'UNITS' && (
            <div className="space-y-6">
               {properties.map(prop => {
                  const propApts = apartments.filter(a => a.property_id === prop.id);
                  const propUnits = registryUnits.filter(u => propApts.some(a => a.id === u.apartment_id));

                  if (propUnits.length === 0) return null;

                  return (
                     <div key={prop.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                        <div className="mb-6 flex items-center gap-3 pb-4 border-b border-slate-100">
                           <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                              <Building2 size={24} />
                           </div>
                           <div>
                              <h3 className="text-xl font-black text-slate-800 tracking-tight">{prop.name}</h3>
                              <p className="text-xs font-bold text-slate-400">{propUnits.length} Unidades Registrales</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                           {propUnits.map(unit => {
                              const apt = propApts.find(a => a.id === unit.apartment_id);

                              let statusColor = 'bg-slate-100 text-slate-500';
                              if (unit.estado_tramitacion === 'registrado') statusColor = 'bg-emerald-100 text-emerald-700';
                              if (unit.estado_tramitacion === 'en_curso') statusColor = 'bg-blue-100 text-blue-700';
                              if (unit.estado_tramitacion === 'subsanacion') statusColor = 'bg-orange-100 text-orange-700';

                              return (
                                 <div key={unit.id} className="bg-slate-50 hover:bg-slate-100/80 transition-colors p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="flex-1">
                                       <div className="flex items-center gap-2 mb-1.5">
                                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide ${statusColor}`}>{unit.estado_tramitacion.replace('_', ' ')}</span>
                                          <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{unit.identificador_registral ? `CRU: ${unit.identificador_registral}` : 'Sin CRU'}</span>
                                       </div>
                                       <h4 className="font-bold text-slate-800 text-base">{apt?.name}</h4>
                                       <p className="text-xs text-slate-500 mt-0.5">{unit.direccion_completa || 'Dirección pendiente de completar'}</p>

                                       <div className="flex gap-3 mt-3 text-[10px] font-bold text-slate-400">
                                          <span className={`flex items-center gap-1 ${unit.referencia_catastral ? 'text-emerald-600' : ''}`}>
                                             {unit.referencia_catastral ? <CheckCircle2 size={12} /> : <ShieldCheck size={12} />}
                                             {unit.referencia_catastral ? 'Ref. Catastral OK' : 'Falta Ref. Catastral'}
                                          </span>
                                          <span className={`flex items-center gap-1 ${unit.licencia_turistica ? 'text-emerald-600' : ''}`}>
                                             {unit.licencia_turistica ? <CheckCircle2 size={12} /> : <ShieldCheck size={12} />}
                                             {unit.licencia_turistica ? 'Licencia OK' : 'Falta Licencia'}
                                          </span>
                                       </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-auto">
                                       <button onClick={() => setEditingUnit(unit)} className="px-4 py-2 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 text-slate-600 rounded-xl border border-slate-200 transition-all text-xs font-bold flex items-center gap-2 shadow-sm">
                                          <FileText size={14} /> Editar
                                       </button>
                                       <button
                                          onClick={() => window.open('https://sede.registradores.org/site/invitado/propiedad/busqueda/referencia-catastral', '_blank')}
                                          className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors" title="Sede Electrónica"
                                       >
                                          <ExternalLink size={16} />
                                       </button>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  );
               })}
               {properties.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                     <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                     <p className="text-slate-500 font-bold">No hay propiedades registradas</p>
                  </div>
               )}
            </div>
         )}

         {activeTab === 'PRESENTATIONS' && (
            <div className="space-y-6">
               <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex justify-between items-center shadow-xl">
                  <div>
                     <h3 className="text-2xl font-black">Modelo Anual (Informativo)</h3>
                     <p className="text-indigo-200 text-sm mt-1">Generación del fichero XBRL para cumplimiento de la Orden VAU/1560/2025.</p>
                  </div>
                  <button onClick={() => setIsXBRLModalOpen(true)} className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black hover:scale-105 transition-transform flex items-center gap-2">
                     <FileCheck size={18} /> Generar Informe
                  </button>
               </div>

               <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                           <th className="px-6 py-4">Fecha</th>
                           <th className="px-6 py-4">Trámite</th>
                           <th className="px-6 py-4">Ejercicio</th>
                           <th className="px-6 py-4">Estado</th>
                           <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-xs font-medium">
                        {presentations.map(p => (
                           <tr key={p.id}>
                              <td className="px-6 py-4 font-bold">{p.fecha_presentacion}</td>
                              <td className="px-6 py-4">
                                 {p.tipo_tramite === 'modelo_anual_xbrl' ? 'Modelo Informativo Anual' : 'Solicitud Registro'}
                              </td>
                              <td className="px-6 py-4">{p.ejercicio_fiscal || '-'}</td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${p.estado === 'presentado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {p.estado}
                                 </span>
                                 {p.csv_acuse && <div className="text-[9px] font-mono text-slate-400 mt-1">CSV: {p.csv_acuse}</div>}
                              </td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                 {p.xbrl_blob && (
                                    <button className="p-2 bg-slate-50 text-indigo-600 rounded-lg hover:bg-indigo-50" title="Descargar XML" onClick={() => {
                                       const blob = new Blob([decodeURIComponent(escape(atob(p.xbrl_blob || '')))], { type: 'application/xml' });
                                       const url = URL.createObjectURL(blob);
                                       const a = document.createElement('a'); a.href = url; a.download = 'report.xbrl'; a.click();
                                    }}>
                                       <Download size={16} />
                                    </button>
                                 )}
                                 {p.estado === 'borrador' && (
                                    <button onClick={() => markAsPresented(p)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Marcar Presentado">
                                       <CheckCircle2 size={16} />
                                    </button>
                                 )}
                              </td>
                           </tr>
                        ))}
                        {presentations.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400 italic">No hay presentaciones registradas.</td></tr>}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* MODAL EDICION UNIDAD */}
         {editingUnit && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                     <h3 className="text-2xl font-black text-slate-800">Datos Registrales</h3>
                     <button onClick={() => setEditingUnit(null)} className="text-slate-400"><X size={28} /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Referencia Catastral</label>
                           <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUnit.referencia_catastral} onChange={e => setEditingUnit({ ...editingUnit, referencia_catastral: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Licencia Turística</label>
                           <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUnit.licencia_turistica} onChange={e => setEditingUnit({ ...editingUnit, licencia_turistica: e.target.value })} />
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Dirección Completa (Normalizada)</label>
                        <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUnit.direccion_completa} onChange={e => setEditingUnit({ ...editingUnit, direccion_completa: e.target.value })} placeholder="Calle, Número, Planta, Puerta..." />
                     </div>

                     <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Municipio</label>
                           <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUnit.municipio} onChange={e => setEditingUnit({ ...editingUnit, municipio: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Provincia</label>
                           <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUnit.provincia} onChange={e => setEditingUnit({ ...editingUnit, provincia: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase">C.P.</label>
                           <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUnit.codigo_postal} onChange={e => setEditingUnit({ ...editingUnit, codigo_postal: e.target.value })} />
                        </div>
                     </div>

                     <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <label className="text-[10px] font-black text-indigo-400 uppercase">Código Registral Único (CRU)</label>
                        <input className="w-full mt-1 p-3 bg-white border border-indigo-200 rounded-xl font-black text-indigo-900" value={editingUnit.identificador_registral} onChange={e => setEditingUnit({ ...editingUnit, identificador_registral: e.target.value })} placeholder="Identificador de la Finca Registral" />
                        <p className="text-[10px] text-indigo-400 mt-2">Dato obligatorio para la inscripción en el Registro de la Propiedad (RD 1312/2024).</p>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Estado Trámite</label>
                           <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUnit.estado_tramitacion} onChange={e => setEditingUnit({ ...editingUnit, estado_tramitacion: e.target.value as any })}>
                              <option value="pendiente">Pendiente</option>
                              <option value="en_curso">En Curso</option>
                              <option value="registrado">Registrado</option>
                              <option value="subsanacion">Subsanación</option>
                              <option value="rechazado">Rechazado</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Nº Registro Oficial</label>
                           <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUnit.numero_registro_oficial} onChange={e => setEditingUnit({ ...editingUnit, numero_registro_oficial: e.target.value })} placeholder="Si ya está asignado" />
                        </div>
                     </div>

                     <button onClick={() => handleSaveUnit(editingUnit)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">Guardar Cambios</button>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL XBRL */}
         {isXBRLModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                     <h3 className="text-xl font-black text-slate-800">Generar Modelo Anual</h3>
                     <button onClick={() => setIsXBRLModalOpen(false)} className="text-slate-400"><X size={24} /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="text-center">
                        <FileCheck size={48} className="mx-auto text-indigo-500 mb-4" />
                        <p className="text-sm text-slate-500">Se generará un fichero <strong>XML/XBRL</strong> conforme a la Orden VAU/1560/2025 conteniendo la actividad de <strong>{registryUnits.length} unidades registrales</strong>.</p>
                     </div>

                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ejercicio Fiscal</label>
                        <select className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-lg text-center" value={xbrlYear} onChange={e => setXbrlYear(Number(e.target.value))}>
                           <option value={2024}>2024</option>
                           <option value={2025}>2025</option>
                           <option value={2026}>2026</option>
                        </select>
                     </div>

                     <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800 font-medium">
                        <p>✓ Se incluirá el titular: {fiscalProfile?.nombre_razon_social}</p>
                        <p>✓ Se calcularán días de ocupación e ingresos.</p>
                     </div>

                     <button onClick={handleGenerateXBRL} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">Generar y Descargar</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};