import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Normaliza y genera un slug válido a partir de un nombre.
 * toLowerCase, quitar acentos, permitir solo a-z, 0-9 y guiones.
 */
const generateSlug = (name: string): string => {
   return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar diacríticos (acentos)
      .replace(/[^a-z0-9\s-]/g, '')    // Permitir solo letras, números, espacios y guiones
      .trim()
      .replace(/\s+/g, '-')            // Espacios a guiones
      .replace(/-+/g, '-')             // Colapsar guiones múltiples
      .replace(/^-+|-+$/g, '');        // Trim de guiones al inicio/fin
};

export const WebsiteBuilder: React.FC = () => {
   const navigate = useNavigate();

   // Estado local para el borrador del sitio
   const [siteDraft, setSiteDraft] = useState({
      title: '',
      slug: ''
   });

   // Controlar si el usuario ha editado el slug manualmente
   const [isManualSlug, setIsManualSlug] = useState(false);
   const [validationError, setValidationError] = useState<string | null>(null);

   // Auto-generación del slug cuando cambia el título (si no es manual)
   useEffect(() => {
      if (!isManualSlug && siteDraft.title) {
         setSiteDraft(prev => ({
            ...prev,
            slug: generateSlug(siteDraft.title)
         }));
      }
   }, [siteDraft.title, isManualSlug]);

   // Validación del slug en tiempo real
   useEffect(() => {
      const slug = siteDraft.slug;
      if (slug.length > 0 && slug.length < 3) {
         setValidationError('El slug debe tener al menos 3 caracteres');
      } else if (slug.length > 50) {
         setValidationError('El slug no puede superar los 50 caracteres');
      } else if (slug.length > 0 && !/^[a-z0-9-]+$/.test(slug)) {
         setValidationError('Solo se permiten letras minúsculas, números y guiones');
      } else if (slug.startsWith('-') || slug.endsWith('-')) {
         setValidationError('El slug no puede empezar ni terminar con guión');
      } else if (slug.includes('--')) {
         setValidationError('No se permiten guiones consecutivos');
      } else {
         setValidationError(null);
      }
   }, [siteDraft.slug]);

   const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSiteDraft(prev => ({ ...prev, title: e.target.value }));
   };

   const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsManualSlug(true);
      // Limpieza básica inmediata mientras escribe
      const val = e.target.value.toLowerCase().replace(/\s+/g, '-');
      setSiteDraft(prev => ({ ...prev, slug: val }));
   };

   const handleRegenerateSlug = () => {
      setIsManualSlug(false);
      setSiteDraft(prev => ({ ...prev, slug: generateSlug(prev.title) }));
   };

   return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
         <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
         >
            <ArrowLeft className="w-5 h-5" />
            Volver
         </button>

         <header>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Constructor de Web</h1>
            <p className="text-slate-500">Configura la identidad y dirección de tu página pública.</p>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Panel de Configuración */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nombre de la Propiedad</label>
                  <input
                     type="text"
                     value={siteDraft.title}
                     onChange={handleTitleChange}
                     placeholder="Ej: El Rinconcito Rural"
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-medium"
                  />
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between items-center">
                     <label className="text-xs font-black uppercase tracking-widest text-slate-400">Slug de la URL</label>
                     {isManualSlug && (
                        <button
                           onClick={handleRegenerateSlug}
                           className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tighter"
                        >
                           <RefreshCw className="w-3 h-3" /> Regenerar
                        </button>
                     )}
                  </div>
                  <div className="relative">
                     <input
                        type="text"
                        value={siteDraft.slug}
                        onChange={handleSlugChange}
                        placeholder="el-rinconcito-rural"
                        className={`w-full px-5 py-4 bg-slate-50 border ${validationError ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-200'} rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-mono text-sm`}
                     />
                     <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {validationError ? (
                           <AlertCircle className="w-5 h-5 text-rose-500" />
                        ) : siteDraft.slug.length >= 3 ? (
                           <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : null}
                     </div>
                  </div>
                  {validationError && (
                     <p className="text-rose-500 text-[11px] font-bold pl-1">{validationError}</p>
                  )}
               </div>

               <div className="pt-4 p-5 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600">
                     <Globe size={16} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Previsualización de URL</span>
                  </div>
                  <p className="text-slate-700 font-mono text-xs break-all">
                     rp-web.pages.dev/<span className="text-indigo-600 font-bold">{siteDraft.slug || '...'}</span>
                  </p>
               </div>
            </div>

            {/* Info / Estado */}
            <div className="space-y-6">
               <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
                  <h3 className="text-lg font-bold mb-4">¿Qué es el Slug?</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                     Es la parte de la dirección web que identifica tu propiedad de forma única.
                     Un buen slug debe ser corto, descriptivo y fácil de recordar.
                  </p>
                  <ul className="space-y-3 text-xs font-medium">
                     <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        Generado automáticamente
                     </li>
                     <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        Amigable para buscadores (SEO)
                     </li>
                     <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        Personalizable en cualquier momento
                     </li>
                  </ul>
               </div>
            </div>
         </div>
      </div>
   );
};
