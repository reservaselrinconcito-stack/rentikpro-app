
import React, { useState, useRef } from 'react';
import { Camera, FileUp, ListChecks, CheckCircle, AlertCircle, RefreshCw, X, User, Hash, CreditCard, Users as PaxIcon } from 'lucide-react';
import { ocrService, PulseExtractedData } from '../services/ocrService';
import { toast } from 'sonner';

interface PulseCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: PulseExtractedData) => void;
}

export const PulseCompletionModal: React.FC<PulseCompletionModalProps> = ({ isOpen, onClose, onComplete }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [extracted, setExtracted] = useState<PulseExtractedData>({
        guest_name: '',
        locator: '',
        total_price: 0,
        pax_adults: 1,
        pax_children: 0,
        currency: 'EUR'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            setImagePreview(dataUrl);
            setIsProcessing(true);

            try {
                const data = await ocrService.processPulseImage(dataUrl);
                setExtracted(prev => ({
                    ...prev,
                    ...data,
                    guest_name: data.guest_name || prev.guest_name,
                    locator: data.locator || prev.locator,
                    total_price: data.total_price || prev.total_price,
                    pax_adults: data.pax_adults || prev.pax_adults
                }));
                toast.success("OCR: Datos detectados");
            } catch (error) {
                console.error("OCR Error:", error);
                toast.error("Error al procesar la imagen");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleConfirm = () => {
        if (!extracted.guest_name || !extracted.locator) {
            toast.error("El nombre y el localizador son obligatorios");
            return;
        }
        onComplete(extracted);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <header className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Camera className="text-indigo-600" size={28} />
                            Completar desde Pulse
                        </h3>
                        <p className="text-slate-500 text-sm font-medium mt-1">Booking.com (Datos faltantes)</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={28} /></button>
                </header>

                <div className="flex bg-slate-100 p-2 m-8 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileUp size={16} /> Subir Captura
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ListChecks size={16} /> Rellenar Manual
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    {activeTab === 'upload' ? (
                        <div className="space-y-6">
                            {!imagePreview ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer group"
                                >
                                    <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform"><FileUp size={32} /></div>
                                    <div className="text-center">
                                        <p className="font-black text-slate-700 uppercase tracking-widest text-[10px] mb-1">Cargar Pantallazo</p>
                                        <p className="text-xs text-slate-400">Haz clic para seleccionar la imagen de Pulse</p>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista Previa</p>
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[9/16] bg-slate-100 flex items-center justify-center">
                                            <img src={imagePreview} className="object-cover w-full h-full" alt="Pulse screenshot" />
                                            {isProcessing && (
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                                    <RefreshCw size={32} className="text-indigo-600 animate-spin" />
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Procesando OCR...</p>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { setImagePreview(null); setExtracted({ guest_name: '', locator: '', total_price: 0, pax_adults: 1, pax_children: 0, currency: 'EUR' }); }}
                                            className="text-[10px] font-black underline text-slate-400 hover:text-rose-500 uppercase tracking-widest block text-center w-full"
                                        >
                                            Cambiar imagen
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datos Detectados</p>
                                        <div className="space-y-4">
                                            <DataField icon={User} label="Huésped" value={extracted.guest_name} onChange={v => setExtracted({ ...extracted, guest_name: v })} />
                                            <DataField icon={Hash} label="Localizador" value={extracted.locator} onChange={v => setExtracted({ ...extracted, locator: v })} />
                                            <DataField icon={CreditCard} label="Precio Total" value={extracted.total_price} type="number" onChange={v => setExtracted({ ...extracted, total_price: Number(v) })} />
                                            <div className="grid grid-cols-2 gap-3">
                                                <DataField icon={PaxIcon} label="Adultos" value={extracted.pax_adults} type="number" onChange={v => setExtracted({ ...extracted, pax_adults: Number(v) })} />
                                                <DataField icon={PaxIcon} label="Niños" value={extracted.pax_children} type="number" onChange={v => setExtracted({ ...extracted, pax_children: Number(v) })} />
                                            </div>
                                        </div>

                                        {!isProcessing && !extracted.guest_name && (
                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 flex gap-3">
                                                <AlertCircle size={18} className="shrink-0" />
                                                <p className="text-[10px] font-bold leading-relaxed">No hemos podido detectar todos los campos automáticamente. Por favor, rellénalos manualmente.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Introducción Manual de Datos</p>
                            <div className="grid grid-cols-1 gap-4">
                                <label className="block space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Completo</span>
                                    <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={extracted.guest_name} onChange={e => setExtracted({ ...extracted, guest_name: e.target.value })} placeholder="Ej: Maria Gonzalez" />
                                </label>
                                <label className="block space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Localizador de Booking (# o 1234.567.890)</span>
                                    <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={extracted.locator} onChange={e => setExtracted({ ...extracted, locator: e.target.value })} placeholder="Ej: 3456789012" />
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Importe Total</span>
                                        <input type="number" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold font-mono" value={extracted.total_price} onChange={e => setExtracted({ ...extracted, total_price: Number(e.target.value) })} />
                                    </label>
                                    <label className="block space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Adultos</span>
                                        <input type="number" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={extracted.pax_adults} onChange={e => setExtracted({ ...extracted, pax_adults: Number(e.target.value) })} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-8 border-t bg-slate-50/50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-700 transition-colors">Cancelar</button>
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} /> Confirmar y Completar
                    </button>
                </footer>
            </div>
        </div>
    );
};

const DataField = ({ icon: Icon, label, value, onChange, type = 'text' }: { icon: any, label: string, value: any, onChange: (v: string) => void, type?: string }) => (
    <div className="space-y-1">
        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
        <div className="relative group">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${value ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 bg-slate-50 group-focus-within:text-indigo-600 group-focus-within:bg-indigo-50'}`}>
                <Icon size={14} />
            </div>
            <input
                type={type}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-300 focus:bg-white transition-all outline-none"
                value={value}
                placeholder={`Detectando...`}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    </div>
);
