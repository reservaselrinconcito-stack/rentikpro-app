
import React, { useState, useEffect } from 'react';
import { projectManager } from '../services/projectManager';
import { UserSettings } from '../types';
import {
    Save, Building2, Wallet, Users, Globe, Mail, Phone, Calendar,
    ArrowLeft, Plus, Trash2, Instagram, Facebook, Youtube, Twitter, Video,
    Building, FileText, Settings as SettingsIcon, CheckCircle2, Download, Upload, Shield,
    MailCheck, Server, Lock, Database
} from 'lucide-react';
import { PolicyEditor } from '../components/PolicyEditor';
import { smtpService } from '../services/smtpService';
import { toast } from 'sonner';

import { useStore } from '../hooks/useStore';

export const Settings = ({ onSave }: { onSave: () => void }) => {
    const store = useStore(); // Added useStore hook
    const [settings, setSettings] = useState<UserSettings | null>(null); // Changed initial state to null
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'backup' | 'email_ingest' | 'policies' | 'smtp'>('profile'); // Added activeTab state
    const [loading, setLoading] = useState(true); // Added loading state

    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

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
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px - 6 py - 4 text - sm font - medium whitespace - nowrap transition - colors ${activeTab === 'profile' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'} `}
                    >
                        Perfil
                    </button>
                    <button
                        onClick={() => setActiveTab('email_ingest')}
                        className={`px - 6 py - 4 text - sm font - medium whitespace - nowrap transition - colors ${activeTab === 'email_ingest' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'} `}
                    >
                        Email Ingest & Reservas
                    </button>
                    <button
                        onClick={() => setActiveTab('smtp')}
                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'smtp' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Email SMTP
                    </button>
                    <button
                        onClick={() => setActiveTab('policies')}
                        className={`px - 6 py - 4 text - sm font - medium whitespace - nowrap transition - colors ${activeTab === 'policies' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'} `}
                    >
                        Políticas (Default)
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`px - 6 py - 4 text - sm font - medium whitespace - nowrap transition - colors ${activeTab === 'backup' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-600 hover:text-slate-900'} `}
                    >
                        Backup
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

                    <button
                        onClick={() => projectManager.exportFullBackupZip()}
                        className="w-full p-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-4"
                    >
                        <div className="p-4 bg-white/20 rounded-2xl">
                            <Download size={32} />
                        </div>
                        <div className="text-left">
                            <h4 className="text-xl font-black">Descargar Copia de Seguridad Completa</h4>
                            <p className="text-indigo-200 text-sm font-medium">Base de datos, Configuración y Archivos Multimedia (ZIP)</p>
                        </div>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors flex flex-col items-center gap-4" onClick={() => alert('Función de exportar pendiente de conectar con API')}>
                            <Download size={32} className="text-slate-400" />
                            <span className="font-bold text-slate-700">Exportar Datos</span>
                        </button>
                        <button className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors flex flex-col items-center gap-4" onClick={() => alert('Función de importar pendiente de conectar con API')}>
                            <Upload size={32} className="text-slate-400" />
                            <span className="font-bold text-slate-700">Importar Datos</span>
                        </button>
                    </div>
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
