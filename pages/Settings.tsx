import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectManager, projectManager } from '../services/projectManager';
import { UserSettings, Property } from '../types';
import {
    Save, Building2, Wallet, Users, Globe, Mail, Phone, Calendar,
    ArrowLeft, Plus, Trash2, Instagram, Facebook, Youtube, Twitter, Video,
    Building, FileText, Settings as SettingsIcon, CheckCircle2, Download, Upload, Shield,
    MailCheck, Server, Lock, Database, Wifi, RefreshCw, Eye, EyeOff, Copy, CheckCheck
} from 'lucide-react';
import { PolicyEditor } from '../components/PolicyEditor';
import { smtpService } from '../services/smtpService';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';
import { publishAvailability, generatePublicToken } from '../services/publicWebSync';
import { isTauri } from '../utils/isTauri';
import { workspaceManager } from '../services/workspaceManager';
import { getActiveWorkspacePath, isCloudPath, revealInFinder } from '../src/services/workspaceInfo';

import { useStore } from '../hooks/useStore';

import { syncCoordinator } from '../services/syncCoordinator';

export const Settings = ({ onSave }: { onSave: () => void }) => {
    const navigate = useNavigate();
    const store = useStore(); // Added useStore hook
    const [settings, setSettings] = useState<UserSettings | null>(null); // Changed initial state to null
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'backup' | 'email_ingest' | 'policies' | 'smtp' | 'web_publica' | 'sync'>('profile'); // Added activeTab state
    const [loading, setLoading] = useState(true); // Added loading state

    // Web Pública state
    const [webProperties, setWebProperties] = useState<Property[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [webConfig, setWebConfig] = useState<Partial<Property>>({
        web_calendar_enabled: false,
        public_token: '',
        allowed_origins_json: '[]',
        show_prices: false,
        max_range_days: 365,
    });
    const [originsText, setOriginsText] = useState('');
    const [publishing, setPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState<{ ok: boolean; msg: string; at?: number } | null>(null);
    const [showToken, setShowToken] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);

    const [saved, setSaved] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [lastBackupBlobUrl, setLastBackupBlobUrl] = useState<string | null>(null);
    const [lastBackupFilename, setLastBackupFilename] = useState<string | null>(null);

    const tauri = isTauri();
    const activeWorkspacePath = tauri ? getActiveWorkspacePath() : null;
    const workspaceBadge = activeWorkspacePath
        ? (isCloudPath(activeWorkspacePath) ? 'iCloud' : 'Local')
        : null;

    useEffect(() => {
        loadSettings();
        loadWebProperties();
    }, []);

    const loadWebProperties = async () => {
        try {
            const props = await projectManager.getStore().getProperties();
            setWebProperties(props);
            if (props.length > 0) {
                const first = props[0];
                setSelectedPropertyId(first.id);
                loadWebConfig(first);
            }
        } catch (e) {
            console.error('[WEB:PUBLISH] Error loading properties:', e);
        }
    };

    const loadWebConfig = (prop: Property) => {
        setWebConfig({
            web_calendar_enabled: prop.web_calendar_enabled ?? false,
            public_token: prop.public_token ?? '',
            allowed_origins_json: prop.allowed_origins_json ?? '[]',
            show_prices: prop.show_prices ?? false,
            max_range_days: prop.max_range_days ?? 365,
            last_published_at: prop.last_published_at,
        });
        try {
            const origins: string[] = JSON.parse(prop.allowed_origins_json || '[]');
            setOriginsText(origins.join('\n'));
        } catch { setOriginsText(''); }
        setPublishStatus(prop.last_published_at ? {
            ok: true,
            msg: 'Último publish exitoso',
            at: prop.last_published_at,
        } : null);
    };

    const saveWebConfig = async () => {
        const prop = webProperties.find(p => p.id === selectedPropertyId);
        if (!prop) return;
        const origins = originsText
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);
        const updated: Property = {
            ...prop,
            ...webConfig,
            allowed_origins_json: JSON.stringify(origins),
            updated_at: Date.now(),
        };
        await projectManager.getStore().saveProperty(updated);
        setWebProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
        toast.success('Configuración web guardada');
    };

    const handlePublishNow = async () => {
        const prop = webProperties.find(p => p.id === selectedPropertyId);
        if (!prop) return;

        // Save config first
        const origins = originsText
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);
        const updatedProp: Property = {
            ...prop,
            ...webConfig,
            allowed_origins_json: JSON.stringify(origins),
            updated_at: Date.now(),
        };
        await projectManager.getStore().saveProperty(updatedProp);

        const workerUrl = (import.meta.env.VITE_PUBLIC_WORKER_URL || '').replace(/\/$/, '');
        const adminKey = import.meta.env.VITE_PUBLIC_WORKER_ADMIN_KEY || '';

        if (!workerUrl) {
            toast.error('Configura VITE_PUBLIC_WORKER_URL en el .env');
            return;
        }

        setPublishing(true);
        setPublishStatus(null);
        console.log('[WEB:PUBLISH] Initiating publish...');

        const result = await publishAvailability(updatedProp, workerUrl, adminKey);

        if (result.ok && result.publishedAt) {
            // Persist last_published_at
            const withTimestamp: Property = { ...updatedProp, last_published_at: result.publishedAt };
            await projectManager.getStore().saveProperty(withTimestamp);
            setWebProperties(prev => prev.map(p => p.id === withTimestamp.id ? withTimestamp : p));
            setWebConfig(prev => ({ ...prev, last_published_at: result.publishedAt }));
            setPublishStatus({ ok: true, msg: '✅ Publicado correctamente', at: result.publishedAt });
            toast.success('Disponibilidad publicada correctamente');
        } else {
            setPublishStatus({ ok: false, msg: result.error || 'Error desconocido' });
            toast.error('Error al publicar: ' + result.error);
        }

        setPublishing(false);
    };

    const loadSettings = async (retry = true) => {
        try {
            setLoading(true);
            let data = await projectManager.getStore().getSettings();

            // If settings is still null or missing essential id (should not happen with ensureSettings)
            if (!data && retry) {
                console.warn('Settings missing, attempting to ensure...');
                await projectManager.getStore().ensureSettings();
                data = await projectManager.getStore().getSettings();
            }

            setSettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        try {
            await projectManager.getStore().saveSettings(settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error al guardar la configuración');
        }
    };

    const updateField = (field: keyof UserSettings, value: any) => {
        setSettings(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-slate-500 font-medium">Cargando configuración...</p>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-center">
                <h3 className="text-xl font-bold text-rose-800 mb-2">Error de Configuración</h3>
                <p className="text-rose-600 mb-4">No se pudo cargar la configuración del proyecto.</p>
                <button
                    onClick={() => loadSettings()}
                    className="bg-rose-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-rose-700 transition-colors"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Configuración</h2>
                    <p className="text-slate-500">Datos del negocio, información fiscal y preferencias generales.</p>
                </div>
            </div>

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'profile' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Perfil
                    </button>
                    <button
                        onClick={() => setActiveTab('email_ingest')}
                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'email_ingest' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Email Ingest &amp; Reservas
                    </button>
                    <button
                        onClick={() => setActiveTab('smtp')}
                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'smtp' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Email SMTP
                    </button>
                    <button
                        onClick={() => setActiveTab('policies')}
                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'policies' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Políticas (Default)
                    </button>
                    <button
                        onClick={() => setActiveTab('web_publica')}
                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'web_publica' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        🌐 Web Pública
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'backup' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Backup
                    </button>
                    <button
                        onClick={() => setActiveTab('sync')}
                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'sync' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        🔄 Sincronización (BYOC)
                    </button>
                </nav>
            </div>

            {activeTab === 'profile' && (
                <div className="space-y-6">
                    {/* Business Data */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl">
                                <Building size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Datos del Negocio</h3>
                                <p className="text-slate-400 text-sm">Información general de tu empresa</p>
                                <div className="flex gap-2 mt-2">
                                    {settings.social_instagram && <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:scale-110 transition-transform"><Instagram size={16} /></a>}
                                    {settings.social_facebook && <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:scale-110 transition-transform"><Facebook size={16} /></a>}
                                    {settings.social_tiktok && <a href={settings.social_tiktok} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:scale-110 transition-transform"><Video size={16} /></a>}
                                    {settings.social_x && <a href={settings.social_x} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:scale-110 transition-transform"><Twitter size={16} /></a>}
                                    {settings.social_youtube && <a href={settings.social_youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:scale-110 transition-transform"><Youtube size={16} /></a>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Nombre del Negocio
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                    value={settings.business_name || ''}
                                    onChange={e => updateField('business_name', e.target.value)}
                                    placeholder="Ej: Alojamientos El Rinconcito"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Descripción
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                    value={settings.business_description || ''}
                                    onChange={e => updateField('business_description', e.target.value)}
                                    placeholder="Breve descripción de tu negocio"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fiscal Information */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
                                <FileText size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Información Fiscal</h3>
                                <p className="text-slate-400 text-sm">Datos legales y fiscales</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Razón Social
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                    value={settings.fiscal_name || ''}
                                    onChange={e => updateField('fiscal_name', e.target.value)}
                                    placeholder="Nombre legal de la empresa"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    NIF/CIF
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                    value={settings.fiscal_id || ''}
                                    onChange={e => updateField('fiscal_id', e.target.value)}
                                    placeholder="B12345678"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Dirección Fiscal
                            </label>
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                value={settings.fiscal_address || ''}
                                onChange={e => updateField('fiscal_address', e.target.value)}
                                placeholder="Calle, número, piso"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Ciudad
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                    value={settings.fiscal_city || ''}
                                    onChange={e => updateField('fiscal_city', e.target.value)}
                                    placeholder="Madrid"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Código Postal
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                    value={settings.fiscal_postal_code || ''}
                                    onChange={e => updateField('fiscal_postal_code', e.target.value)}
                                    placeholder="28001"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    País
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                    value={settings.fiscal_country || ''}
                                    onChange={e => updateField('fiscal_country', e.target.value)}
                                    placeholder="España"
                                />
                            </div>
                        </div>

                        {settings.fiscal_type === 'IRPF_PARTICULAR' && (
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h4 className="font-bold text-slate-800">Copropietarios</h4>
                                        <p className="text-xs text-slate-400">Añade los titulares para el reparto de rentas.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newOwners = [...(settings.owners || []), { id: crypto.randomUUID(), name: '', nif: '', share: 0 }];
                                            updateField('owners', newOwners);
                                        }}
                                        className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Añadir Propietario
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {(settings.owners || []).map((owner, index) => (
                                        <div key={owner.id || index} className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Nombre completo"
                                                    className="w-full bg-transparent text-sm font-bold placeholder:font-normal outline-none"
                                                    value={owner.name}
                                                    onChange={e => {
                                                        const newOwners = [...(settings.owners || [])];
                                                        newOwners[index].name = e.target.value;
                                                        updateField('owners', newOwners);
                                                    }}
                                                />
                                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mt-1">Nombre</label>
                                            </div>
                                            <div className="w-32">
                                                <input
                                                    type="text"
                                                    placeholder="DNI/NIF"
                                                    className="w-full bg-transparent text-sm font-bold placeholder:font-normal outline-none uppercase"
                                                    value={owner.nif}
                                                    onChange={e => {
                                                        const newOwners = [...(settings.owners || [])];
                                                        newOwners[index].nif = e.target.value;
                                                        updateField('owners', newOwners);
                                                    }}
                                                />
                                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mt-1">NIF</label>
                                            </div>
                                            <div className="w-20">
                                                <input
                                                    type="number"
                                                    placeholder="%"
                                                    min="0"
                                                    max="100"
                                                    className="w-full bg-transparent text-sm font-bold placeholder:font-normal outline-none text-right"
                                                    value={owner.share}
                                                    onChange={e => {
                                                        const newOwners = [...(settings.owners || [])];
                                                        newOwners[index].share = parseFloat(e.target.value) || 0;
                                                        updateField('owners', newOwners);
                                                    }}
                                                />
                                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mt-1 text-right">% Part.</label>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newOwners = (settings.owners || []).filter((_, i) => i !== index);
                                                    updateField('owners', newOwners);
                                                }}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(settings.owners || []).length === 0 && (
                                        <div className="text-center py-6 text-slate-400 text-sm italic border border-dashed border-slate-200 rounded-2xl">
                                            No hay propietarios añadidos. Se asumirá 100% para el titular principal.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-violet-100 text-violet-600 rounded-2xl">
                                <Mail size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Contacto</h3>
                                <p className="text-slate-400 text-sm">Email y teléfono para marketing y comunicaciones</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Tipo de Régimen
                                </label>
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                    value={settings.fiscal_type || 'IRPF_PARTICULAR'}
                                    onChange={e => updateField('fiscal_type', e.target.value)}
                                >
                                    <option value="IRPF_PARTICULAR">IRPF Particular (Rendimientos Inmob.)</option>
                                    <option value="AUTONOMO">Autónomo (Actividad Económica)</option>
                                    <option value="SOCIEDAD_SL">Sociedad Mercantil (S.L.)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Email Principal *
                                </label>
                                <input
                                    type="email"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                                    value={settings.contact_email || ''}
                                    onChange={e => updateField('contact_email', e.target.value)}
                                    placeholder="info@miempresa.com"
                                />
                                <p className="text-xs text-slate-400 mt-2">Se usará para enviar emails de marketing</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Email Gestor / Contable
                                </label>
                                <input
                                    type="email"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                                    value={settings.accountant_email || ''}
                                    onChange={e => updateField('accountant_email', e.target.value)}
                                    placeholder="gestor@asesoria.com"
                                />
                                <p className="text-xs text-slate-400 mt-2">Para envíos directos de borrador de renta</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Email Técnico Channel
                                </label>
                                <input
                                    type="email"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                                    value={settings.technical_channel_email || ''}
                                    onChange={e => updateField('technical_channel_email', e.target.value)}
                                    placeholder="tecnico@channel.com"
                                />
                                <p className="text-xs text-slate-400 mt-2">Contacto técnico para incidencias de conexión</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Teléfono *
                                </label>
                                <input
                                    type="tel"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                                    value={settings.contact_phone || ''}
                                    onChange={e => updateField('contact_phone', e.target.value)}
                                    placeholder="+34 600 000 000"
                                />
                                <p className="text-xs text-slate-400 mt-2">Para WhatsApp y mensajes SMS</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Sitio Web
                            </label>
                            <input
                                type="url"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                                value={settings.contact_website || ''}
                                onChange={e => updateField('contact_website', e.target.value)}
                                placeholder="https://www.miempresa.com"
                            />
                        </div>

                        {/* Social Media */}
                        <div className="pt-6 mt-6 border-t border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Globe size={18} className="text-indigo-600" /> Redes Sociales
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                        <Instagram size={12} /> Instagram
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-pink-500/20 transition-all outline-none"
                                        value={settings.social_instagram || ''}
                                        onChange={e => updateField('social_instagram', e.target.value)}
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                        <Facebook size={12} /> Facebook
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                                        value={settings.social_facebook || ''}
                                        onChange={e => updateField('social_facebook', e.target.value)}
                                        placeholder="https://facebook.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                        <Video size={12} /> TikTok
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                                        value={settings.social_tiktok || ''}
                                        onChange={e => updateField('social_tiktok', e.target.value)}
                                        placeholder="https://tiktok.com/@..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                        <Twitter size={12} /> X (Twitter)
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                                        value={settings.social_x || ''}
                                        onChange={e => updateField('social_x', e.target.value)}
                                        placeholder="https://x.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                        <Youtube size={12} /> YouTube
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
                                        value={settings.social_youtube || ''}
                                        onChange={e => updateField('social_youtube', e.target.value)}
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl">
                                <SettingsIcon size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Preferencias</h3>
                                <p className="text-slate-400 text-sm">Configuración por defecto de la aplicación</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Moneda
                                </label>
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                                    value={settings.default_currency || 'EUR'}
                                    onChange={e => updateField('default_currency', e.target.value)}
                                >
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="USD">USD - Dólar</option>
                                    <option value="GBP">GBP - Libra</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Zona Horaria
                                </label>
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                                    value={settings.default_timezone || 'Europe/Madrid'}
                                    onChange={e => updateField('default_timezone', e.target.value)}
                                >
                                    <option value="Europe/Madrid">Europa/Madrid</option>
                                    <option value="Europe/London">Europa/Londres</option>
                                    <option value="America/New_York">América/Nueva York</option>
                                    <option value="America/Los_Angeles">América/Los Ángeles</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Formato de Fecha
                                </label>
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                                    value={settings.date_format || 'DD/MM/YYYY'}
                                    onChange={e => updateField('date_format', e.target.value as any)}
                                >
                                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                                </select>
                            </div>
                        </div>

                        {/* Developer Mode */}
                        <div className="pt-6 mt-6 border-t border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <SettingsIcon size={18} className="text-slate-900" /> Modo Desarrollador
                            </h4>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div>
                                    <h4 className="font-bold text-slate-700">Activar Modo Debug</h4>
                                    <p className="text-xs text-slate-400">Muestra paneles flotantes con contadores reales de datos.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={localStorage.getItem('rentik_debug_mode') === 'true'}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                localStorage.setItem('rentik_debug_mode', 'true');
                                            } else {
                                                localStorage.removeItem('rentik_debug_mode');
                                            }
                                            // Force UI update (hacky but effective for simple global toggle without context)
                                            window.location.reload();
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl mt-4">
                                <div>
                                    <h4 className="font-bold text-indigo-900">Panel de Diagnóstico</h4>
                                    <p className="text-xs text-indigo-600">Verifica la salud del sistema, tablas y contadores en tiempo real.</p>
                                </div>
                                <button
                                    onClick={() => navigate('/diagnostics')}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                                >
                                    Abrir
                                </button>
                            </div>
                        </div>

                        {/* Project Management */}
                        <div className="pt-6 mt-6 border-t border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Database size={18} className="text-slate-900" /> Gestión del Proyecto
                            </h4>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-700">Cerrar Proyecto Actual</h4>
                                        <p className="text-xs text-slate-400">Vuelve a la pantalla de inicio para cambiar de proyecto.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (confirm("¿Estás seguro de que quieres cerrar este proyecto?")) {
                                                await projectManager.closeProject();
                                                setTimeout(() => window.location.reload(), 500);
                                            }
                                        }}
                                        className="bg-white border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {activeTab === 'smtp' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-sky-100 text-sky-600 rounded-2xl">
                            <MailCheck size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">Servidor de Correo (SMTP)</h3>
                            <p className="text-slate-400 text-sm">Configura el envío de emails de marketing desde tu cuenta personal.</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800 mb-6">
                        <Lock className="shrink-0 mt-1" size={20} />
                        <div className="text-sm">
                            <p className="font-bold">Información de Seguridad</p>
                            <p>Tus credenciales se guardan LOCALMENTE en este dispositivo. No se envían a ningún servidor de RentikPro.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Email Remitente (Outgoing From) *
                            </label>
                            <input
                                type="email"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-sky-500/20 transition-all outline-none"
                                value={settings.email_outgoing_from || ''}
                                onChange={e => updateField('email_outgoing_from', e.target.value)}
                                placeholder="tu-email-real@dominio.com"
                            />
                            <p className="text-xs text-slate-400 mt-2">Este email aparecerá como remitente en las campañas.</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Servidor SMTP (Host) *
                            </label>
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-sky-500/20 transition-all outline-none"
                                value={settings.smtp_host || ''}
                                onChange={e => updateField('smtp_host', e.target.value)}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Puerto SMTP *
                            </label>
                            <input
                                type="number"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-sky-500/20 transition-all outline-none"
                                value={settings.smtp_port || 465}
                                onChange={e => updateField('smtp_port', parseInt(e.target.value))}
                                placeholder="465 (SSL) o 587 (TLS)"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Usuario SMTP *
                            </label>
                            <input
                                type="text"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-sky-500/20 transition-all outline-none"
                                value={settings.smtp_user || ''}
                                onChange={e => updateField('smtp_user', e.target.value)}
                                placeholder="usuario@dominio.com"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Contraseña SMTP *
                            </label>
                            <input
                                type="password"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-sky-500/20 transition-all outline-none"
                                value={settings.smtp_pass || ''}
                                onChange={e => updateField('smtp_pass', e.target.value)}
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <div>
                                <h4 className="font-bold text-slate-700">Modo de Envío</h4>
                                <p className="text-xs text-slate-400">Controla cómo se envían las campañas automatizadas.</p>
                            </div>
                            <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                                <button
                                    onClick={() => updateField('marketing_send_mode', 'manual')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${(!settings.marketing_send_mode || settings.marketing_send_mode === 'manual') ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    MANUAL (Seguro)
                                </button>
                                <button
                                    onClick={() => updateField('marketing_send_mode', 'automatic')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${settings.marketing_send_mode === 'automatic' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    AUTOMÁTICO
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={async () => {
                                    if (!settings.email_outgoing_from) {
                                        toast.error("Configura el 'Email Remitente' primero.");
                                        return;
                                    }
                                    const loadingToast = toast.loading("Enviando prueba...");
                                    const result = await smtpService.sendEmail(
                                        settings.email_outgoing_from,
                                        "Prueba de Configuración SMTP - RentikPro",
                                        "<h1>¡Funciona!</h1><p>Tu configuración SMTP es correcta.</p>",
                                        settings
                                    );
                                    toast.dismiss(loadingToast);
                                    if (result.success) {
                                        toast.success("Email de prueba enviado correctamente");
                                    } else {
                                        toast.error("Fallo en el envío: " + result.error);
                                    }
                                }}
                                className="bg-sky-100 text-sky-700 px-6 py-3 rounded-xl font-bold hover:bg-sky-200 transition-colors flex items-center gap-2"
                            >
                                <Server size={18} /> Probar Configuración
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'email_ingest' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl">
                            <Mail size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">Email Ingest & Reservas</h3>
                            <p className="text-slate-400 text-sm">Configuración de la ingesta automática de reservas</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Email Técnico de Reservas *
                            </label>
                            <input
                                type="email"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                                value={settings.technical_reservations_email || ''}
                                onChange={e => updateField('technical_reservations_email', e.target.value)}
                                placeholder="reservas@tudominio.com"
                            />
                            <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-100">
                                <strong>¿Por qué es necesario?</strong><br />
                                Este es el email que usará el sistema para recibir notificaciones automáticas y detalles (DETAILS) de las OTAs. Debe ser una cuenta dedicada.
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Email Personal (Opcional)
                            </label>
                            <input
                                type="email"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                                value={settings.personal_email || ''}
                                onChange={e => updateField('personal_email', e.target.value)}
                                placeholder="tu-email-personal@ejemplo.com"
                            />
                            <p className="text-xs text-slate-400 mt-2">Para comunicaciones humanas si difiere del técnico.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <div>
                                <h4 className="font-bold text-slate-700">Completado Manual</h4>
                                <p className="text-xs text-slate-400">Permitir editar reservas incompletas manualmente.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.allow_manual_completion !== false} // Default true
                                    onChange={e => updateField('allow_manual_completion', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <div>
                                <h4 className="font-bold text-slate-700">Requerir Detalles</h4>
                                <p className="text-xs text-slate-400">Exigir paso por 'DETAILS' para cerrar reservas (Booking.com).</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.require_details_to_close || false}
                                    onChange={e => updateField('require_details_to_close', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'policies' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl">
                            <Shield size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">Políticas por Defecto</h3>
                            <p className="text-slate-400 text-sm">Configura las políticas generales de reserva.</p>
                        </div>
                    </div>
                    <PolicyEditor scopeType="PROPERTY" scopeId="default" onClose={() => { }} />
                </div>
            )}

            {activeTab === 'backup' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
                            <Save size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">Copia de Seguridad</h3>
                            <p className="text-slate-400 text-sm">Exporta e importa tus datos.</p>
                        </div>
                    </div>

                    {tauri && (
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-slate-800">Ubicación del Workspace</h4>
                                        {workspaceBadge && (
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${workspaceBadge === 'iCloud' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                {workspaceBadge}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 font-mono text-[11px] text-slate-600 break-all bg-white border border-slate-200 rounded-2xl p-3">
                                        {activeWorkspacePath || 'No hay workspace activo (elige uno al iniciar).'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <button
                                    onClick={async () => {
                                        if (!activeWorkspacePath) return;
                                        try {
                                            await revealInFinder(activeWorkspacePath);
                                        } catch (e: any) {
                                            console.error('[Settings][Workspace] reveal failed', e);
                                            toast.error(e?.message || String(e));
                                        }
                                    }}
                                    disabled={!activeWorkspacePath}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Abrir carpeta
                                </button>

                                <button
                                    onClick={async () => {
                                        const tid = toast.loading('Cambiando ubicación del workspace...');
                                        try {
                                            const dialog = await import('@tauri-apps/plugin-dialog');
                                            const picked = await dialog.open({
                                                directory: true,
                                                multiple: false,
                                                title: 'Cambiar ubicación del workspace',
                                            });
                                            if (!picked) {
                                                toast.dismiss(tid);
                                                return;
                                            }
                                            const newPath = Array.isArray(picked) ? (picked[0] || '') : picked;
                                            if (!newPath) {
                                                toast.dismiss(tid);
                                                return;
                                            }

                                            if (!confirm('Cambiar el workspace recargará la app. Si eliges una carpeta vacía se creará un workspace nuevo. ¿Continuar?')) {
                                                toast.dismiss(tid);
                                                return;
                                            }

                                            await workspaceManager.setActiveWorkspace(newPath);
                                            toast.dismiss(tid);
                                            toast.success('Workspace actualizado. Reiniciando...');
                                            setTimeout(() => window.location.reload(), 600);
                                        } catch (e: any) {
                                            toast.dismiss(tid);
                                            console.error('[Settings][Workspace] switch failed', e);
                                            toast.error(e?.message || String(e));
                                        }
                                    }}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800"
                                >
                                    Cambiar ubicacion...
                                </button>
                            </div>

                            <div className="text-[10px] text-slate-500 font-bold">
                                macOS puede pedir confirmacion la primera vez si mueves la carpeta a iCloud Drive.
                            </div>
                        </div>
                    )}

                    {!lastBackupBlobUrl ? (
                        <button
                            onClick={async () => {
                                const toastId = toast.loading("Generando Backup...");
                                // SAFARI FIX: Open popup synchronously before async work
                                const popup = window.open('', '_blank');
                                if (popup) {
                                    popup.document.write('Preparando descarga de backup, por favor espere...');
                                }

                                try {
                                    setExporting(true);
                                    // Make sure state updates before heavy work
                                    await new Promise(r => setTimeout(r, 100));

                                    const { blob, filename } = await projectManager.exportFullBackupZip();
                                    const url = URL.createObjectURL(blob);

                                    // If we have a popup, use it to trigger download
                                    if (popup && !popup.closed) {
                                        popup.document.body.innerHTML = `<a id="dl" href="${url}" download="${filename}">Descargando...</a>`;
                                        const a = popup.document.getElementById('dl');
                                        if (a) a.click();

                                        // Close popup after a delay
                                        setTimeout(() => {
                                            URL.revokeObjectURL(url);
                                            popup.close();
                                        }, 2000);
                                    } else {
                                        // Fallback if popup was blocked or closed
                                        ProjectManager.triggerDownload(blob, filename);
                                        setTimeout(() => URL.revokeObjectURL(url), 30000);
                                    }

                                    setLastBackupBlobUrl(url); // Keep for "click here if not started"
                                    setLastBackupFilename(filename);
                                    toast.dismiss(toastId);
                                    toast.success("Backup completado con éxito");
                                } catch (err) {
                                    if (popup && !popup.closed) popup.close();
                                    console.error("Export error:", err);
                                    toast.error("Error exportando: " + err);
                                } finally {
                                    setExporting(false);
                                }
                            }}
                            disabled={exporting}
                            className={`w-full p-8 ${exporting ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-3xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-4`}
                        >
                            <div className="p-4 bg-white/20 rounded-2xl">
                                <Download size={32} className={exporting ? 'animate-bounce' : ''} />
                            </div>
                            <div className="text-left">
                                <h4 className="text-xl font-black">{exporting ? 'Generando Backup...' : 'Preparar Backup Completo'}</h4>
                                <p className="text-indigo-200 text-sm font-medium">Bases de datos, Configuración y Archivos (.rentikpro)</p>
                            </div>
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <a
                                href={lastBackupBlobUrl}
                                download={lastBackupFilename || 'backup.rentikpro'}
                                className="w-full p-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-4"
                                onClick={() => {
                                    setTimeout(() => {
                                        setLastBackupBlobUrl(null);
                                        setLastBackupFilename(null);
                                    }, 2000);
                                }}
                            >
                                <div className="p-4 bg-white/20 rounded-2xl">
                                    <Download size={32} />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-xl font-black">¡Listo! Haz clic para Descargar</h4>
                                    <p className="text-emerald-100 text-sm font-medium">{lastBackupFilename}</p>
                                </div>
                            </a>
                            <button
                                onClick={() => { setLastBackupBlobUrl(null); setLastBackupFilename(null); }}
                                className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                Cancelar / Generar otro
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                            <h4 className="font-black text-slate-800 flex items-center gap-2">
                                <Download size={18} className="text-indigo-600" /> Exportación Modular
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => projectManager.exportProjectDataOnly()}
                                    className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-xs font-bold text-slate-600 flex flex-col items-center gap-2"
                                >
                                    <Database size={20} />
                                    Solo Datos
                                </button>
                                <button
                                    onClick={() => projectManager.exportProjectStructureOnly()}
                                    className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-all text-xs font-bold text-slate-600 flex flex-col items-center gap-2"
                                >
                                    <Building size={20} />
                                    Estructura
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                            <h4 className="font-black text-slate-800 flex items-center gap-2">
                                <Upload size={18} className="text-emerald-600" /> Importación Modular
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const loading = toast.loading('Importando datos...');
                                            try {
                                                const text = await file.text();
                                                const res = await projectManager.importProjectDataOnly(text);
                                                if (res.success) {
                                                    toast.success('Datos importados!');
                                                    setTimeout(() => window.location.reload(), 1000);
                                                } else {
                                                    toast.error('Fallo la importación: ' + (res.errors?.general || 'Error desconocido'));
                                                }
                                            } catch (err: any) {
                                                console.error('[Settings][Backup] Import data failed', err);
                                                toast.error('Error al importar: ' + (err?.message || String(err)));
                                            } finally {
                                                toast.dismiss(loading);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <button className="w-full h-full p-3 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all text-xs font-bold text-slate-600 flex flex-col items-center gap-2">
                                        <Database size={20} />
                                        Solo Datos
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const loading = toast.loading('Importando estructura...');
                                            try {
                                                const text = await file.text();
                                                const res = await projectManager.importProjectStructureOnly(text);
                                                if (res.success) {
                                                    toast.success('Estructura importada!');
                                                    setTimeout(() => window.location.reload(), 1000);
                                                } else {
                                                    toast.error('Fallo la importación: ' + (res.error || 'Error desconocido'));
                                                }
                                            } catch (err: any) {
                                                console.error('[Settings][Backup] Import structure failed', err);
                                                toast.error('Error al importar: ' + (err?.message || String(err)));
                                            } finally {
                                                toast.dismiss(loading);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <button className="w-full h-full p-3 bg-white border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-all text-xs font-bold text-slate-600 flex flex-col items-center gap-2">
                                        <Building size={20} />
                                        Estructura
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 italic text-[10px] text-slate-400 text-center uppercase tracking-widest">
                        Recomendado: Usar "Backup Completo" para traspasar proyectos entre dispositivos.
                    </div>
                </div>
            )}

            {activeTab === 'web_publica' && (
                <div className="space-y-6">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl">
                                <Globe size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Web Pública</h3>
                                <p className="text-slate-400 text-sm">Expone la disponibilidad de tu propiedad a tu web pública vía API segura.</p>
                            </div>
                        </div>

                        {/* Property selector */}
                        {webProperties.length > 1 && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Propiedad</label>
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                    value={selectedPropertyId}
                                    onChange={e => {
                                        setSelectedPropertyId(e.target.value);
                                        const prop = webProperties.find(p => p.id === e.target.value);
                                        if (prop) loadWebConfig(prop);
                                    }}
                                >
                                    {webProperties.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {webProperties.length === 0 && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-sm">
                                No hay propiedades configuradas. Crea una propiedad primero.
                            </div>
                        )}

                        {webProperties.length > 0 && (
                            <div className="space-y-6">
                                {/* Toggle enabled */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div>
                                        <h4 className="font-bold text-slate-700">Calendario web activo</h4>
                                        <p className="text-xs text-slate-400">Permite que tu web pública consulte la disponibilidad.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={webConfig.web_calendar_enabled ?? false}
                                            onChange={e => setWebConfig(prev => ({ ...prev, web_calendar_enabled: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {/* Token */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Token Público</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type={showToken ? 'text' : 'password'}
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none pr-12"
                                                value={webConfig.public_token || ''}
                                                onChange={e => setWebConfig(prev => ({ ...prev, public_token: e.target.value }))}
                                                placeholder="Genera un token con el botón →"
                                            />
                                            <button
                                                onClick={() => setShowToken(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                                                title={showToken ? 'Ocultar' : 'Mostrar'}
                                            >
                                                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const t = generatePublicToken();
                                                setWebConfig(prev => ({ ...prev, public_token: t }));
                                                setShowToken(true);
                                                toast.success('Token generado. Guarda la configuración.');
                                            }}
                                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-2xl font-bold text-sm hover:bg-indigo-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                                        >
                                            <RefreshCw size={16} /> Generar/Rotar
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (webConfig.public_token) {
                                                    const ok = await copyToClipboard(webConfig.public_token);
                                                    if (ok) {
                                                        setTokenCopied(true);
                                                        setTimeout(() => setTokenCopied(false), 2000);
                                                    } else {
                                                        toast.error('No se pudo copiar el token (permiso denegado)');
                                                    }
                                                }
                                            }}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2"
                                            title="Copiar token"
                                        >
                                            {tokenCopied ? <CheckCheck size={16} className="text-emerald-600" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">⚠️ El token se guarda localmente. El Worker almacena solo su hash SHA-256.</p>
                                </div>

                                {/* Allowed Origins */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Orígenes Permitidos (CORS)</label>
                                    <textarea
                                        rows={4}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        value={originsText}
                                        onChange={e => setOriginsText(e.target.value)}
                                        placeholder={"https://mi-hotel.com\nhttps://www.mi-hotel.com"}
                                    />
                                    <p className="text-xs text-slate-400 mt-2">Un dominio por línea. Solo estos orígenes podrán consultar la API desde el navegador.</p>
                                </div>

                                {/* Show Prices */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div>
                                        <h4 className="font-bold text-slate-700">Mostrar precios</h4>
                                        <p className="text-xs text-slate-400">Incluye el precio por noche en la respuesta pública.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={webConfig.show_prices ?? false}
                                            onChange={e => setWebConfig(prev => ({ ...prev, show_prices: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                {/* Max Range Days */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Rango Máximo Consultable (días)</label>
                                    <input
                                        type="number"
                                        min={7}
                                        max={730}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        value={webConfig.max_range_days ?? 365}
                                        onChange={e => setWebConfig(prev => ({ ...prev, max_range_days: parseInt(e.target.value) || 365 }))}
                                    />
                                    <p className="text-xs text-slate-400 mt-2">El payload publicado cubrirá este número de días desde hoy.</p>
                                </div>

                                {/* Save config */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={saveWebConfig}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={16} /> Guardar configuración
                                    </button>
                                </div>

                                {/* Publish */}
                                <div className="pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2"><Wifi size={18} className="text-indigo-600" /> Publicar Ahora</h4>
                                            <p className="text-xs text-slate-400">Calcula la disponibilidad y la sube al Worker público.</p>
                                        </div>
                                        <button
                                            onClick={handlePublishNow}
                                            disabled={publishing || !webConfig.web_calendar_enabled || !webConfig.public_token}
                                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {publishing ? (
                                                <><RefreshCw size={16} className="animate-spin" /> Publicando...</>
                                            ) : (
                                                <><Wifi size={16} /> Publicar ahora</>
                                            )}
                                        </button>
                                    </div>

                                    {!webConfig.web_calendar_enabled && (
                                        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                                            Activa el calendario web para poder publicar.
                                        </div>
                                    )}

                                    {publishStatus && (
                                        <div className={`mt-3 p-4 rounded-2xl flex items-start gap-3 text-sm ${publishStatus.ok
                                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                            : 'bg-rose-50 border border-rose-200 text-rose-800'
                                            }`}>
                                            {publishStatus.ok
                                                ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                                                : <Shield size={18} className="shrink-0 mt-0.5" />}
                                            <div>
                                                <p className="font-bold">{publishStatus.msg}</p>
                                                {publishStatus.at && (
                                                    <p className="text-xs opacity-70 mt-1">
                                                        {new Date(publishStatus.at).toLocaleString('es-ES')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Variables de entorno requeridas</p>
                                        <code className="text-xs text-slate-600 block">VITE_PUBLIC_WORKER_URL=https://tu-worker.workers.dev</code>
                                        <code className="text-xs text-slate-600 block">VITE_PUBLIC_WORKER_ADMIN_KEY=tu-admin-key-secreta</code>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'sync' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl">
                            <RefreshCw size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">Sincronización WebDAV (BYOC)</h3>
                            <p className="text-slate-400 text-sm">Trae tu propia nube (Bring Your Own Cloud) para sincronizar entre dispositivos.</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-slate-700">Estado de Sincronización</h4>
                                <p className="text-xs text-slate-400">Activa la sincronización remota automática (al abrir/cerrar).</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.webdav_sync_enabled || false}
                                    onChange={e => updateField('webdav_sync_enabled', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {settings.webdav_sync_enabled && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">URL WebDAV (Endpoint)</label>
                                    <input
                                        type="url"
                                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        value={settings.webdav_url || ''}
                                        onChange={e => updateField('webdav_url', e.target.value)}
                                        placeholder="https://tu-nube.com/remote.php/dav/files/user/"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2">Ej: Nextcloud, OwnCloud, Synology, etc. El sistema creará una carpeta /RentikProSync/</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Usuario</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            value={settings.webdav_user || ''}
                                            onChange={e => updateField('webdav_user', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Contraseña / App Token</label>
                                        <input
                                            type="password"
                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            value={settings.webdav_pass || ''}
                                            onChange={e => updateField('webdav_pass', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {settings.webdav_sync_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={async () => {
                                    const tid = toast.loading("Comprobando nube...");
                                    try {
                                        const res = await syncCoordinator.syncDown();
                                        toast.dismiss(tid);
                                        if (res.success) {
                                            toast.success("Sincronización completada.");
                                            // Optional: reload if data changed
                                        } else if (res.conflict) {
                                            if (confirm("Conflicto detectado: La nube tiene una versión diferente que también ha sido modificada. ¿Quieres SOBRESCRIBIR tu local con la versión de la nube?")) {
                                                const fres = await syncCoordinator.syncDown(true);
                                                if (fres.success) {
                                                    toast.success("Proyecto restaurado desde la nube.");
                                                    window.location.reload();
                                                }
                                            }
                                        } else {
                                            toast.error(res.error || "Error de sincronización");
                                        }
                                    } catch (e: any) {
                                        toast.dismiss(tid);
                                        toast.error(e.message);
                                    }
                                }}
                                className="p-8 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-3xl hover:bg-indigo-100 transition-all flex flex-col items-center gap-3 text-center"
                            >
                                <Download size={24} />
                                <div>
                                    <h4 className="font-black">Descargar de Nube</h4>
                                    <p className="text-[10px] opacity-70">Traer versión remota a este dispositivo</p>
                                </div>
                            </button>

                            <button
                                onClick={async () => {
                                    const tid = toast.loading("Subiendo a la nube...");
                                    try {
                                        const res = await syncCoordinator.syncUp();
                                        toast.dismiss(tid);
                                        if (res.success) {
                                            toast.success("Subida completada con éxito.");
                                        } else if (res.conflict) {
                                            if (confirm("Conflicto detectado: La nube tiene una versión más reciente. ¿Quieres SOBRESCRIBIR la nube con tu versión local?")) {
                                                const fres = await syncCoordinator.syncUp(true);
                                                if (fres.success) toast.success("Nube actualizada (Sobrescrita).");
                                            }
                                        } else {
                                            toast.error(res.error || "Error de subida");
                                        }
                                    } catch (e: any) {
                                        toast.dismiss(tid);
                                        toast.error(e.message);
                                    }
                                }}
                                className="p-8 bg-white border border-slate-200 text-slate-700 rounded-3xl hover:bg-indigo-50 hover:border-indigo-100 transition-all flex flex-col items-center gap-3 text-center"
                            >
                                <Upload size={24} />
                                <div>
                                    <h4 className="font-black">Subir a la Nube</h4>
                                    <p className="text-[10px] opacity-70">Guardar versión local como maestra en la nube</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>Guardando...</>
                    ) : (
                        <> <Save size={20} /> Guardar Cambios </>
                    )}
                </button>
            </div>
        </div>
    );
};
