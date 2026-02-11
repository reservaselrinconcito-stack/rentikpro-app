
import React, { useState, useEffect } from 'react';
import { projectManager } from '../services/projectManager';
import { UserSettings } from '../types';
import { Building, FileText, Mail, Settings as SettingsIcon, Save, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC = () => {
    const [settings, setSettings] = useState<UserSettings>({
        id: 'default',
        fiscal_country: 'España',
        default_currency: 'EUR',
        default_timezone: 'Europe/Madrid',
        date_format: 'DD/MM/YYYY',
        created_at: Date.now(),
        updated_at: Date.now()
    });

    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await projectManager.getStore().getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleSave = async () => {
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
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Configuración</h2>
                    <p className="text-slate-500">Datos del negocio, información fiscal y preferencias generales.</p>
                </div>
            </div>

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
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        className={`px-12 py-5 rounded-[2rem] font-black text-sm shadow-xl transition-all flex items-center gap-3 ${saved
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105'
                            }`}
                    >
                        {saved ? (
                            <>
                                <CheckCircle2 size={20} /> Guardado
                            </>
                        ) : (
                            <>
                                <Save size={20} /> Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
