import React, { useEffect, useMemo, useCallback, useRef, useState } from "react";
import {
   Search, Layout, Image, MessageSquare, Map, CreditCard,
   Navigation, Zap, Plus, Layers, Trash2, Copy,
   ZoomIn, ZoomOut, Maximize, Monitor, Tablet, Smartphone,
   RotateCcw, RotateCw, Save, X, ChevronRight, ChevronDown,
   HelpCircle, CheckCircle2, AlertCircle, Palette, Sparkles,
   GripVertical, Eye, EyeOff, LayoutPanelLeft, Globe, Minus, History as HistoryIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { projectManager } from "../services/projectManager";

import {
   WebSite, Property, Apartment, PropertySnapshot, SiteDraft, SiteOverrides,
   DeviceMode, InspectorTab, BlockType, BlockStyle, BlockNode, PageState, HistoryState
} from "../types";
import { createSiteDraftFromSnapshot, resolveSiteConfig, updateSiteDraftWithLevel } from "../services/siteResolver";

const STORAGE_KEY = "rentikpro.websiteBuilder.draft.v1";

const now = () => Date.now();
const uid = () => `${now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

// --- Advanced Array Editor Component ---
const ArrayEditor: React.FC<{
   field: any;
   value: any[];
   onChange: (newValue: any[]) => void;
}> = ({ field, value, onChange }) => {
   const [openIndex, setOpenIndex] = useState<number | null>(null);

   const addItem = () => {
      onChange([...value, deepClone(field.defaultItem)]);
      setOpenIndex(value.length);
   };

   const removeItem = (idx: number) => {
      if (confirm("¿Borrar este ítem?")) {
         onChange(value.filter((_, i) => i !== idx));
         setOpenIndex(null);
      }
   };

   const duplicateItem = (idx: number) => {
      const copy = deepClone(value[idx]);
      const next = [...value];
      next.splice(idx + 1, 0, copy);
      onChange(next);
      setOpenIndex(idx + 1);
   };

   const moveItem = (from: number, to: number) => {
      if (to < 0 || to >= value.length) return;
      const next = [...value];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
      setOpenIndex(to);
   };

   const updateItem = (idx: number, updates: any) => {
      const next = [...value];
      next[idx] = { ...next[idx], ...updates };
      onChange(next);
   };

   return (
      <div className="space-y-3">
         <div className="flex items-center justify-between gap-2 px-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{field.label}</div>
            <button
               onClick={addItem}
               className="flex items-center gap-1 text-[10px] font-bold text-black bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded-lg transition-all"
            >
               <Plus size={10} /> Añadir
            </button>
         </div>

         <div className="space-y-2">
            {value.map((item, idx) => (
               <div
                  key={idx}
                  className={`border rounded-2xl transition-all ${openIndex === idx ? "bg-white border-black shadow-lg" : "bg-neutral-50 border-neutral-100"}`}
               >
                  <div
                     className="p-3 flex items-center justify-between gap-3 cursor-pointer group"
                     onClick={() => setOpenIndex(idx === openIndex ? null : idx)}
                  >
                     <div className="flex items-center gap-3 min-w-0">
                        <div className="w-5 h-5 rounded-lg bg-neutral-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                           {idx + 1}
                        </div>
                        <div className="text-xs font-bold truncate">
                           {item.title || item.name || item.q || item.caption || `${field.itemLabel} ${idx + 1}`}
                        </div>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-black" onClick={(e) => (e.stopPropagation(), moveItem(idx, idx - 1))} title="Arriba">
                           <ChevronDown size={12} className="rotate-180" />
                        </button>
                        <button className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-black" onClick={(e) => (e.stopPropagation(), moveItem(idx, idx + 1))} title="Abajo">
                           <ChevronDown size={12} />
                        </button>
                        <button className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-black" onClick={(e) => (e.stopPropagation(), duplicateItem(idx))} title="Duplicar">
                           <Copy size={12} />
                        </button>
                        <button className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-500" onClick={(e) => (e.stopPropagation(), removeItem(idx))} title="Borrar">
                           <Trash2 size={12} />
                        </button>
                     </div>
                  </div>

                  {openIndex === idx && (
                     <div className="p-4 pt-0 border-t border-neutral-100 space-y-3 mt-1">
                        {field.fields.map((f: any) => (
                           <label key={f.key} className="block">
                              <div className="text-[10px] font-semibold text-neutral-500 mb-1">{f.label}</div>
                              {f.type === "textarea" ? (
                                 <textarea
                                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white focus:ring-2 ring-black/5 outline-none min-h-[60px]"
                                    value={item[f.key] || ""}
                                    onChange={(e) => updateItem(idx, { [f.key]: e.target.value })}
                                 />
                              ) : (
                                 <input
                                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white focus:ring-2 ring-black/5 outline-none"
                                    value={item[f.key] || ""}
                                    onChange={(e) => updateItem(idx, { [f.key]: e.target.value })}
                                 />
                              )}
                           </label>
                        ))}
                     </div>
                  )}
               </div>
            ))}
         </div>
      </div>
   );
};

const baseBlockStyle = (template: PageState["meta"]["template"]): BlockStyle => {
   switch (template) {
      case "Luxury":
         return { background: "bg-neutral-950", text: "text-neutral-100", padding: "py-12 px-6", rounded: "rounded-2xl", shadow: "shadow-lg", border: "border border-white/10", align: "left", maxWidth: "screen" };
      case "Conversion":
         return { background: "bg-white", text: "text-neutral-900", padding: "py-10 px-6", rounded: "rounded-2xl", shadow: "shadow-md", border: "border border-neutral-200", align: "left", maxWidth: "screen" };
      case "Rustic":
         return { background: "bg-amber-50", text: "text-amber-950", padding: "py-12 px-6", rounded: "rounded-2xl", shadow: "shadow-md", border: "border border-amber-200", align: "left", maxWidth: "screen" };
      case "Minimal":
      default:
         return { background: "bg-white", text: "text-neutral-900", padding: "py-12 px-6", rounded: "rounded-2xl", shadow: "shadow-sm", border: "border border-neutral-200", align: "left", maxWidth: "screen" };
   }
};

const defaultPropsByType: Record<BlockType, Record<string, any>> = {
   Header: {
      brand: "RentikPro",
      menu: ["Apartamentos", "Servicios", "Ubicación", "Contacto"],
      ctaLabel: "Reservar",
   },
   Hero: {
      eyebrow: "Alojamientos",
      title: "Tu escapada perfecta empieza aquí",
      subtitle: "Gestiona, vende y convierte con una web rápida, bonita y lista para reservar.",
      primaryCta: "Ver disponibilidad",
      secondaryCta: "Contactar",
   },
   CTA: {
      title: "¿Listo para reservar?",
      subtitle: "Respuesta rápida por WhatsApp y confirmación inmediata.",
      button: "Escríbenos",
   },
   Features: {
      title: "Lo que incluye",
      items: [
         { title: "Check-in fácil", desc: "Instrucciones claras y automatizadas." },
         { title: "Calendario sincronizado", desc: "Evita overbooking con iCal." },
         { title: "Pagos y facturación", desc: "Control de pagos y documentos." },
         { title: "Soporte pro", desc: "Te ayudamos a dejarlo fino." },
      ],
   },
   Gallery: {
      title: "Galería",
      images: [
         { caption: "Salón luminoso", url: "" },
         { caption: "Dormitorio", url: "" },
         { caption: "Cocina equipada", url: "" },
         { caption: "Terraza", url: "" },
         { caption: "Baño", url: "" },
         { caption: "Vistas", url: "" },
      ],
   },
   Testimonials: {
      title: "Opiniones",
      items: [
         { name: "Laura", text: "Muy limpio, ubicación perfecta. Repetiremos." },
         { name: "Marc", text: "Proceso de reserva sencillo y trato excelente." },
         { name: "Ana", text: "Todo tal cual en fotos, súper cómodo." },
      ],
   },
   ApartmentsGrid: {
      title: "Nuestros apartamentos",
      cards: [
         { name: "Apartamento Centro", price: "desde 89€/noche", badges: ["WiFi", "A/C"], desc: "Ideal para parejas y escapadas." },
         { name: "Suite Premium", price: "desde 129€/noche", badges: ["Parking", "Vistas"], desc: "Más espacio y mejores vistas." },
         { name: "Familiar", price: "desde 109€/noche", badges: ["Cocina", "Lavadora"], desc: "Perfecto para familias." },
      ],
   },
   Pricing: {
      title: "Tarifas claras",
      plans: [
         { name: "Flexible", price: "Mejor precio", items: ["Cancelación flexible", "Pago en dos partes", "Soporte"], highlight: false },
         { name: "No reembolsable", price: "-10%", items: ["Descuento directo", "Pago inmediato", "Confirmación"], highlight: true },
         { name: "Larga estancia", price: "-15%", items: ["7+ noches", "Prioridad", "Condiciones especiales"], highlight: false },
      ],
   },
   FAQ: {
      title: "Preguntas frecuentes",
      items: [
         { q: "¿A qué hora es el check-in?", a: "Desde las 15:00. Te enviamos instrucciones el día anterior." },
         { q: "¿Hay cuna?", a: "Sí, bajo petición y según disponibilidad." },
         { q: "¿Se admiten mascotas?", a: "Depende del apartamento. Consúltanos." },
      ],
   },
   Location: {
      title: "Ubicación",
      subtitle: "Estamos cerca de todo: restaurantes, transporte y puntos de interés.",
      address: "Granollers / Vallès Oriental",
      mapNote: "Aquí iría un mapa (integración futura).",
   },
   ContactForm: {
      title: "Contacto",
      subtitle: "Te respondemos rápido.",
      fields: ["Nombre", "Email", "Teléfono", "Mensaje"],
      submit: "Enviar",
   },
   Footer: {
      brand: "RentikPro",
      note: "© " + new Date().getFullYear() + " — Todos los derechos reservados.",
      links: ["Privacidad", "Términos", "Cookies"],
   },
   AvailabilityWidget: {
      title: "Reserva tu estancia",
      subtitle: "Selecciona fechas y reserva al mejor precio garantizado.",
      cta: "Consultar",
   },
   LeadsForm: {
      title: "Solicita información",
      subtitle: "Déjanos tus datos y te contactaremos en menos de 24h.",
      fields: ["Nombre completo", "Email de contacto", "Interés"],
      submit: "Quiero saber más",
   },
   SocialProof: {
      title: "Confianza garantizada",
      logos: ["Airbnb Superhost", "Booking Preferred", "HomeAway"],
      stats: ["+500 Reservas", "4.9/5 Estrellas", "Respuesta rápida"],
   },
};

const createBlock = (type: BlockType, template: PageState["meta"]["template"]): BlockNode => ({
   id: uid(),
   type,
   props: deepClone(defaultPropsByType[type]),
   style: deepClone(baseBlockStyle(template)),
});

const createTemplate = (template: PageState["meta"]["template"]): PageState => {
   const blocks: BlockType[] = [
      "Header",
      "Hero",
      "Features",
      "Gallery",
      "ApartmentsGrid",
      "Testimonials",
      "Pricing",
      "FAQ",
      "Location",
      "CTA",
      "ContactForm",
      "Footer",
   ];

   const state: PageState = {
      meta: {
         template,
         name: `Website (${template})`,
         updatedAt: now(),
      },
      blocks: blocks.map((t) => createBlock(t, template)),
   };

   // Ajustes “de vibe” por template
   if (template === "Luxury") {
      state.blocks = state.blocks.map((b) => {
         if (b.type === "Hero") {
            return {
               ...b,
               props: { ...b.props, title: "Estancias premium con experiencia cinco estrellas", subtitle: "Diseño, confort y una reserva sin fricciones." },
               style: { ...b.style, background: "bg-neutral-950", text: "text-neutral-100", border: "border border-white/10", shadow: "shadow-xl" },
            };
         }
         if (b.type === "Header") {
            return { ...b, props: { ...b.props, brand: "El Rinconcito" }, style: { ...b.style, background: "bg-neutral-950", text: "text-neutral-100", border: "border border-white/10" } };
         }
         return b;
      });
   }

   if (template === "Conversion") {
      state.blocks = state.blocks.map((b) => {
         if (b.type === "Hero") {
            return {
               ...b,
               props: { ...b.props, title: "Reserva en 2 minutos", subtitle: "Disponibilidad en tiempo real. Confirmación rápida. Sin líos." },
               style: { ...b.style, background: "bg-white", text: "text-neutral-900", border: "border border-neutral-200", shadow: "shadow-lg" },
            };
         }
         if (b.type === "CTA") {
            return { ...b, props: { ...b.props, title: "Últimas fechas disponibles", subtitle: "Asegura tu reserva ahora.", button: "Ver fechas" } };
         }
         return b;
      });
   }

   if (template === "Rustic") {
      state.blocks = state.blocks.map((b) => {
         const rusticStyle: BlockStyle = { ...b.style, background: "bg-amber-50", text: "text-amber-950", border: "border border-amber-200", shadow: "shadow-md" };
         if (b.type === "Hero") {
            return { ...b, props: { ...b.props, title: "Un refugio con encanto", subtitle: "Calma, naturaleza y una estancia para desconectar." }, style: rusticStyle };
         }
         return { ...b, style: rusticStyle };
      });
   }

   return state;
};

const getDeviceWidth = (mode: DeviceMode) => {
   if (mode === "mobile") return 390;
   if (mode === "tablet") return 820;
   return 1200;
};

const classByAlign = (align?: BlockStyle["align"]) => {
   if (align === "center") return "text-center";
   if (align === "right") return "text-right";
   return "text-left";
};

const maxWidthClass = (mw?: BlockStyle["maxWidth"]) => {
   if (mw === "prose") return "max-w-3xl";
   if (mw === "full") return "max-w-none";
   return "max-w-6xl";
};

const getEffectiveStyle = (node: BlockNode, device: DeviceMode): BlockStyle => {
   const overrides = node.styleOverrides?.[device] ?? {};
   return { ...node.style, ...overrides };
};

const safeJsonParse = <T,>(raw: string | null): T | null => {
   if (!raw) return null;
   try {
      return JSON.parse(raw) as T;
   } catch {
      return null;
   }
};

function useHistory(initial: PageState) {
   const [history, setHistory] = useState<HistoryState>({
      past: [],
      present: initial,
      future: [],
   });

   const setPresent = useCallback((next: PageState, opts?: { replace?: boolean }) => {
      setHistory((h) => {
         const replace = opts?.replace === true;
         if (replace) return { ...h, present: next };
         return {
            past: [...h.past, h.present],
            present: next,
            future: [],
         };
      });
   }, []);

   const undo = useCallback(() => {
      setHistory((h) => {
         if (h.past.length === 0) return h;
         const prev = h.past[h.past.length - 1];
         const newPast = h.past.slice(0, -1);
         return { past: newPast, present: prev, future: [h.present, ...h.future] };
      });
   }, []);

   const redo = useCallback(() => {
      setHistory((h) => {
         if (h.future.length === 0) return h;
         const next = h.future[0];
         const newFuture = h.future.slice(1);
         return { past: [...h.past, h.present], present: next, future: newFuture };
      });
   }, []);

   return { history, setPresent, undo, redo };
}

const BlockRegistry: Record<
   BlockType,
   {
      title: string;
      description: string;
      render: (node: BlockNode) => React.ReactNode;
      contentFields: Array<{ key: string; label: string; type: "text" | "textarea" }>;
      arrayFields?: Array<{
         key: string;
         label: string;
         itemLabel: string;
         fields: Array<{ key: string; label: string; type: "text" | "textarea" }>;
         defaultItem: Record<string, any>;
      }>;
   }
> = {
   AvailabilityWidget: {
      title: "Availability Widget",
      description: "Widget de calendario y búsqueda de fechas.",
      render: (n) => (
         <div className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center">
                  <h3 className="text-xl font-bold mb-2">{n.props.title}</h3>
                  <p className="text-sm opacity-80 mb-6">{n.props.subtitle}</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                     <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-xs min-w-[120px]">Check-in</div>
                     <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-xs min-w-[120px]">Check-out</div>
                     <button className="px-6 py-3 bg-white text-black font-black rounded-xl text-xs">{n.props.cta}</button>
                  </div>
               </div>
            </div>
         </div>
      ),
      contentFields: [
         { key: "title", label: "Título", type: "text" },
         { key: "subtitle", label: "Subtítulo", type: "text" },
         { key: "cta", label: "Texto Botón", type: "text" },
      ],
   },
   LeadsForm: {
      title: "Leads Form",
      description: "Formulario enfocado a captación de clientes.",
      render: (n) => (
         <div className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <div className="max-w-xl mx-auto">
                  <h2 className="text-2xl font-bold mb-2">{n.props.title}</h2>
                  <p className="text-sm opacity-80 mb-8">{n.props.subtitle}</p>
                  <div className="space-y-4">
                     {(n.props.fields ?? []).map((f: string, i: number) => (
                        <div key={i} className="px-4 py-3 rounded-2xl border border-black/10 bg-neutral-50 text-xs opacity-50">{f}</div>
                     ))}
                     <button className="w-full py-4 bg-black text-white rounded-2xl font-bold text-sm">{n.props.submit}</button>
                  </div>
               </div>
            </div>
         </div>
      ),
      contentFields: [
         { key: "title", label: "Título", type: "text" },
         { key: "subtitle", label: "Subtítulo", type: "text" },
         { key: "submit", label: "Texto Botón", type: "text" },
      ],
   },
   SocialProof: {
      title: "Social Proof",
      description: "Logos y estadísticas de confianza.",
      render: (n) => (
         <div className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <h3 className="text-center text-xs font-black uppercase tracking-widest opacity-50 mb-10">{n.props.title}</h3>
               <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale mb-12">
                  {(n.props.logos ?? []).map((l: string, i: number) => (
                     <div key={i} className="text-sm font-black italic">{l}</div>
                  ))}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(n.props.stats ?? []).map((s: string, i: number) => (
                     <div key={i} className="p-6 rounded-2xl bg-neutral-50 border border-black/5 text-center">
                        <div className="text-lg font-bold">{s}</div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      ),
      contentFields: [
         { key: "title", label: "Título", type: "text" },
      ],
   },
   Header: {
      title: "Header",
      description: "Barra superior con marca, menú y CTA.",
      render: (n) => (
         <div className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold tracking-tight">{n.props.brand}</div>
                  <div className="hidden md:flex items-center gap-6 text-sm opacity-90">
                     {(n.props.menu ?? []).map((m: string, idx: number) => (
                        <span key={idx} className="cursor-default hover:opacity-100 opacity-90">
                           {m}
                        </span>
                     ))}
                  </div>
                  <button className="px-4 py-2 rounded-xl border border-black/10 bg-black text-white text-sm">
                     {n.props.ctaLabel}
                  </button>
               </div>
            </div>
         </div>
      ),
      contentFields: [
         { key: "brand", label: "Marca", type: "text" },
         { key: "ctaLabel", label: "Texto CTA", type: "text" },
      ],
   },
   Hero: {
      title: "Hero",
      description: "Titular principal con CTA.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <div className={`${classByAlign(n.style.align)}`}>
                  <div className="text-xs uppercase tracking-widest opacity-70">{n.props.eyebrow}</div>
                  <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">{n.props.title}</h1>
                  <p className="mt-4 text-base md:text-lg opacity-80 max-w-3xl mx-auto">{n.props.subtitle}</p>
                  <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                     <button className="px-5 py-3 rounded-2xl bg-black text-white text-sm">{n.props.primaryCta}</button>
                     <button className="px-5 py-3 rounded-2xl border border-black/15 text-sm">{n.props.secondaryCta}</button>
                  </div>
               </div>
            </div>
         </section>
      ),
      contentFields: [
         { key: "eyebrow", label: "Eyebrow", type: "text" },
         { key: "title", label: "Título", type: "text" },
         { key: "subtitle", label: "Subtítulo", type: "textarea" },
         { key: "primaryCta", label: "CTA principal", type: "text" },
         { key: "secondaryCta", label: "CTA secundario", type: "text" },
      ],
   },
   CTA: {
      title: "CTA",
      description: "Llamada a la acción corta.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <div className={`${classByAlign(n.style.align)} ${n.style.rounded ?? ""} ${n.style.shadow ?? ""} ${n.style.border ?? ""} p-6 md:p-10`}>
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h3>
                  <p className="mt-2 opacity-80">{n.props.subtitle}</p>
                  <div className="mt-5">
                     <button className="px-5 py-3 rounded-2xl bg-black text-white text-sm">{n.props.button}</button>
                  </div>
               </div>
            </div>
         </section>
      ),
      contentFields: [
         { key: "title", label: "Título", type: "text" },
         { key: "subtitle", label: "Subtítulo", type: "textarea" },
         { key: "button", label: "Botón", type: "text" },
      ],
   },
   Features: {
      title: "Features",
      description: "Lista de características.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h2>
               <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(n.props.items ?? []).map((it: any, idx: number) => (
                     <div key={idx} className={`p-5 ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} ${n.style.shadow ?? "shadow-sm"}`}>
                        <div className="font-medium">{it.title}</div>
                        <div className="mt-1 text-sm opacity-75">{it.desc}</div>
                     </div>
                  ))}
               </div>
            </div>
         </section>
      ),
      contentFields: [{ key: "title", label: "Título", type: "text" }],
      arrayFields: [
         {
            key: "items",
            label: "Características",
            itemLabel: "Feature",
            fields: [
               { key: "title", label: "Título", type: "text" },
               { key: "desc", label: "Descripción", type: "textarea" },
            ],
            defaultItem: { title: "Nueva Feature", desc: "Descripción de la característica." },
         },
      ],
   },
   Gallery: {
      title: "Gallery",
      description: "Rejilla de imágenes (placeholder).",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h2>
               <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(n.props.images ?? []).map((img: any, idx: number) => (
                     <div key={idx} className={`aspect-[4/3] ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} overflow-hidden relative`}>
                        <div className="absolute inset-0 bg-black/5" />
                        <div className="absolute bottom-2 left-2 right-2 text-xs bg-white/80 backdrop-blur px-2 py-1 rounded-xl">
                           {img.caption || `Imagen ${idx + 1}`}
                        </div>
                     </div>
                  ))}
               </div>
               <div className="mt-2 text-xs opacity-60">*Integración de subida de imágenes: siguiente fase.</div>
            </div>
         </section>
      ),
      contentFields: [{ key: "title", label: "Título", type: "text" }],
      arrayFields: [
         {
            key: "images",
            label: "Imágenes",
            itemLabel: "Imagen",
            fields: [{ key: "caption", label: "Pie de foto", type: "text" }],
            defaultItem: { caption: "Nueva Imagen", url: "" },
         },
      ],
   },
   Testimonials: {
      title: "Testimonials",
      description: "Opiniones de clientes.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h2>
               <div className="mt-6 grid md:grid-cols-3 gap-4">
                  {(n.props.items ?? []).map((t: any, idx: number) => (
                     <div key={idx} className={`p-5 ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} ${n.style.shadow ?? "shadow-sm"}`}>
                        <div className="text-sm opacity-80">“{t.text}”</div>
                        <div className="mt-3 text-sm font-medium">{t.name}</div>
                     </div>
                  ))}
               </div>
            </div>
         </section>
      ),
      contentFields: [{ key: "title", label: "Título", type: "text" }],
      arrayFields: [
         {
            key: "items",
            label: "Opiniones",
            itemLabel: "Testimonio",
            fields: [
               { key: "name", label: "Nombre", type: "text" },
               { key: "text", label: "Texto", type: "textarea" },
            ],
            defaultItem: { name: "Cliente", text: "Excelente experiencia." },
         },
      ],
   },
   ApartmentsGrid: {
      title: "ApartmentsGrid",
      description: "Tarjetas de apartamentos.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h2>
               <div className="mt-6 grid md:grid-cols-3 gap-4">
                  {(n.props.cards ?? []).map((c: any, idx: number) => (
                     <div key={idx} className={`p-5 ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} ${n.style.shadow ?? "shadow-sm"}`}>
                        <div className="font-medium">{c.name}</div>
                        <div className="mt-1 text-sm opacity-80">{c.desc}</div>
                        <div className="mt-3 text-sm font-semibold">{c.price}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                           {(c.badgesRaw ? c.badgesRaw.split(",").map((s: any) => s.trim()).filter(Boolean) : (c.badges ?? [])).map((b: string, i2: number) => (
                              <span key={i2} className="text-xs px-2 py-1 rounded-xl border border-black/10">
                                 {b}
                              </span>
                           ))}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </section>
      ),
      contentFields: [{ key: "title", label: "Título", type: "text" }],
      arrayFields: [
         {
            key: "cards",
            label: "Apartamentos",
            itemLabel: "Apartamento",
            fields: [
               { key: "name", label: "Nombre", type: "text" },
               { key: "desc", label: "Descripción", type: "textarea" },
               { key: "price", label: "Precio", type: "text" },
               { key: "badgesRaw", label: "Etiquetas (separadas por coma)", type: "text" },
            ],
            defaultItem: { name: "Nuevo Apartamento", desc: "Descripción...", price: "desde 99€/noche", badges: ["WiFi"], badgesRaw: "WiFi" },
         },
      ],
   },
   Pricing: {
      title: "Pricing",
      description: "Planes / tarifas.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h2>
               <div className="mt-6 grid md:grid-cols-3 gap-4">
                  {(n.props.plans ?? []).map((p: any, idx: number) => (
                     <div
                        key={idx}
                        className={`p-6 ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} ${n.style.shadow ?? "shadow-sm"} ${p.highlight ? "ring-2 ring-black" : ""
                           }`}
                     >
                        <div className="font-medium">{p.name}</div>
                        <div className="mt-2 text-2xl font-semibold">{p.price}</div>
                        <ul className="mt-4 space-y-2 text-sm opacity-80">
                           {(p.items ?? []).map((it: string, i2: number) => (
                              <li key={i2}>• {it}</li>
                           ))}
                        </ul>
                        <button className="mt-6 w-full px-4 py-3 rounded-2xl bg-black text-white text-sm">Elegir</button>
                     </div>
                  ))}
               </div>
            </div>
         </section>
      ),
      contentFields: [{ key: "title", label: "Título", type: "text" }],
      arrayFields: [
         {
            key: "plans",
            label: "Planes",
            itemLabel: "Plan",
            fields: [
               { key: "name", label: "Nombre", type: "text" },
               { key: "price", label: "Precio/Valor", type: "text" },
            ],
            defaultItem: { name: "Nuevo Plan", price: "Personalizado", items: ["Opción 1"], highlight: false },
         },
      ],
   },
   FAQ: {
      title: "FAQ",
      description: "Preguntas frecuentes.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h2>
               <div className="mt-6 space-y-3">
                  {(n.props.items ?? []).map((it: any, idx: number) => (
                     <div key={idx} className={`p-5 ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} ${n.style.shadow ?? "shadow-sm"}`}>
                        <div className="font-medium">{it.q}</div>
                        <div className="mt-1 text-sm opacity-80">{it.a}</div>
                     </div>
                  ))}
               </div>
            </div>
         </section>
      ),
      contentFields: [{ key: "title", label: "Título", type: "text" }],
      arrayFields: [
         {
            key: "items",
            label: "Preguntas",
            itemLabel: "Pregunta",
            fields: [
               { key: "q", label: "Pregunta", type: "text" },
               { key: "a", label: "Respuesta", type: "textarea" },
            ],
            defaultItem: { q: "¿Nueva pregunta?", a: "Respuesta..." },
         },
      ],
   },
   Location: {
      title: "Location",
      description: "Sección ubicación.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h2>
               <p className="mt-2 opacity-80">{n.props.subtitle}</p>
               <div className="mt-5 grid md:grid-cols-2 gap-4">
                  <div className={`p-5 ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} ${n.style.shadow ?? "shadow-sm"}`}>
                     <div className="text-sm font-medium">Dirección</div>
                     <div className="mt-1 text-sm opacity-80">{n.props.address}</div>
                  </div>
                  <div className={`p-5 ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} ${n.style.shadow ?? "shadow-sm"}`}>
                     <div className="text-sm font-medium">Mapa</div>
                     <div className="mt-1 text-sm opacity-70">{n.props.mapNote}</div>
                  </div>
               </div>
            </div>
         </section>
      ),
      contentFields: [
         { key: "title", label: "Título", type: "text" },
         { key: "subtitle", label: "Subtítulo", type: "textarea" },
         { key: "address", label: "Dirección", type: "text" },
      ],
   },
   ContactForm: {
      title: "ContactForm",
      description: "Formulario de contacto.",
      render: (n) => (
         <section className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <div className="grid md:grid-cols-2 gap-6 items-start">
                  <div>
                     <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{n.props.title}</h2>
                     <p className="mt-2 opacity-80">{n.props.subtitle}</p>
                  </div>
                  <div className={`p-6 ${n.style.rounded ?? "rounded-2xl"} ${n.style.border ?? "border border-black/10"} ${n.style.shadow ?? "shadow-sm"}`}>
                     <div className="grid gap-3">
                        {(n.props.fields ?? []).map((f: string, idx: number) => (
                           <input key={idx} className="w-full px-4 py-3 rounded-2xl border border-black/10" placeholder={f} />
                        ))}
                        <button className="mt-1 px-4 py-3 rounded-2xl bg-black text-white text-sm">{n.props.submit}</button>
                     </div>
                     <div className="mt-3 text-xs opacity-60">*Formulario demo (sin envío real).</div>
                  </div>
               </div>
            </div>
         </section>
      ),
      contentFields: [
         { key: "title", label: "Título", type: "text" },
         { key: "subtitle", label: "Subtítulo", type: "textarea" },
         { key: "submit", label: "Texto botón", type: "text" },
      ],
   },
   Footer: {
      title: "Footer",
      description: "Pie de página.",
      render: (n) => (
         <footer className={`w-full ${n.style.background ?? ""} ${n.style.text ?? ""}`}>
            <div className={`mx-auto ${maxWidthClass(n.style.maxWidth)} ${n.style.padding ?? ""}`}>
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="font-semibold">{n.props.brand}</div>
                  <div className="flex gap-4 text-sm opacity-80">
                     {(n.props.links ?? []).map((l: string, idx: number) => (
                        <span key={idx}>{l}</span>
                     ))}
                  </div>
               </div>
               <div className="mt-4 text-xs opacity-70">{n.props.note}</div>
            </div>
         </footer>
      ),
      contentFields: [{ key: "brand", label: "Marca", type: "text" }],
   },
};

function applyStyleToBlock(block: BlockNode, patch: Partial<BlockStyle>): BlockNode {
   return { ...block, style: { ...block.style, ...patch } };
}

function applyPropsToBlock(block: BlockNode, patch: Record<string, any>): BlockNode {
   return { ...block, props: { ...block.props, ...patch } };
}

function moveItem<T>(arr: T[], from: number, to: number) {
   const copy = arr.slice();
   const item = copy.splice(from, 1)[0];
   copy.splice(to, 0, item);
   return copy;
}

const CATEGORIES = [
   { id: 'Navigation', label: 'Navegación', icon: Navigation, types: ['Header', 'Footer'] },
   { id: 'Hero', label: 'Hero / Banners', icon: Sparkles, types: ['Hero'] },
   { id: 'Content', label: 'Contenido', icon: Layers, types: ['Features', 'Gallery', 'FAQ'] },
   { id: 'Social', label: 'Social Proof', icon: MessageSquare, types: ['Testimonials'] },
   { id: 'Commerce', label: 'Commerce / Listing', icon: CreditCard, types: ['Pricing', 'ApartmentsGrid'] },
   { id: 'Utility', label: 'Utilidades', icon: Zap, types: ['Location', 'ContactForm', 'CTA'] },
];

export const WebsiteBuilder = () => {
   // Carga draft o inicial por defecto
   const initial = useMemo<PageState>(() => {
      const saved = safeJsonParse<PageState>(localStorage.getItem(STORAGE_KEY));
      if (saved?.blocks?.length) return saved;
      return createTemplate("Minimal");
   }, []);

   const { history: pageHistory, setPresent, undo, redo } = useHistory(initial);

   const [selectedId, setSelectedId] = useState<string | null>(pageHistory.present.blocks[0]?.id ?? null);
   const [properties, setProperties] = useState<Property[]>([]);
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
   const [activeTemplateLevel, setActiveTemplateLevel] = useState<SiteDraft['templateLevel']>('STANDARD');

   const [currentDraft, setCurrentDraft] = useState<SiteDraft | null>(() => {
      const saved = localStorage.getItem('rentikpro.websiteBuilder.siteDraft');
      return saved ? JSON.parse(saved) : null;
   });
   const [currentOverrides, setCurrentOverrides] = useState<SiteOverrides>(() => {
      const saved = localStorage.getItem('rentikpro.websiteBuilder.siteOverrides');
      return saved ? JSON.parse(saved) : { touchedFields: [], overridesByPath: {}, hiddenEntities: [], ordering: {} };
   });

   useEffect(() => {
      projectManager.getStore().getProperties().then(setProperties);
   }, []);
   const [tab, setTab] = useState<InspectorTab>("content");
   const [device, setDevice] = useState<DeviceMode>("desktop");
   const [zoom, setZoom] = useState(1.0);
   const [searchQuery, setSearchQuery] = useState("");
   const [isPreviewOpen, setIsPreviewOpen] = useState(false);

   const [isSaved, setIsSaved] = useState(true);
   const saveTimer = useRef<number | null>(null);

   const selected = useMemo(
      () => pageHistory.present.blocks.find((b) => b.id === selectedId) ?? null,
      [pageHistory.present.blocks, selectedId]
   );

   const markDirty = useCallback(() => {
      setIsSaved(false);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
         const draft = deepClone(pageHistory.present);
         draft.meta.updatedAt = now();
         localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
         setIsSaved(true);
      }, 650);
   }, [pageHistory.present]);

   // Guardado inicial (asegura que haya draft)
   useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pageHistory.present));
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

   // Atajos teclado
   useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
         const isMac = navigator.platform.toLowerCase().includes("mac");
         const mod = isMac ? e.metaKey : e.ctrlKey;

         if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
            e.preventDefault();
            undo();
            setIsSaved(false);
         }
         if ((mod && e.key.toLowerCase() === "z" && e.shiftKey) || (mod && e.key.toLowerCase() === "y")) {
            e.preventDefault();
            redo();
            setIsSaved(false);
         }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
   }, [undo, redo]);

   const handleCreateSite = async () => {
      if (!selectedPropertyId) {
         toast.error("Selecciona una propiedad primero");
         return;
      }
      try {
         const snapshot = await projectManager.getStore().loadPropertySnapshot(selectedPropertyId);
         const draft = createSiteDraftFromSnapshot(snapshot, activeTemplateLevel);
         const overrides: SiteOverrides = { touchedFields: [], overridesByPath: {}, hiddenEntities: [], ordering: {} };
         const state = resolveSiteConfig(draft, overrides, snapshot);

         setCurrentDraft(draft);
         setCurrentOverrides(overrides);
         setPresent(state);
         setSelectedId(state.blocks[0]?.id || null);

         localStorage.setItem('rentikpro.websiteBuilder.siteDraft', JSON.stringify(draft));
         localStorage.setItem('rentikpro.websiteBuilder.siteOverrides', JSON.stringify(overrides));
         localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

         setIsCreateModalOpen(false);
         toast.success("¡Sitio creado con éxito desde datos reales!");
      } catch (err) {
         console.error(err);
         toast.error("Error al crear el sitio");
      }
   };

   const handleUpdateLevel = async (newLevel: SiteDraft['templateLevel']) => {
      if (!currentDraft) return;
      try {
         const snapshot = await projectManager.getStore().loadPropertySnapshot(currentDraft.propertyId);
         const updatedDraft = updateSiteDraftWithLevel(currentDraft, newLevel, snapshot);
         const state = resolveSiteConfig(updatedDraft, currentOverrides, snapshot);

         setCurrentDraft(updatedDraft);
         setPresent(state);
         localStorage.setItem('rentikpro.websiteBuilder.siteDraft', JSON.stringify(updatedDraft));
         localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
         toast.success(`Nivel actualizado a ${newLevel}`);
      } catch (err) {
         console.error(err);
         toast.error("Error al actualizar nivel");
      }
   };

   const handleSync = async (forceAll = false) => {
      if (!currentDraft) {
         toast.error("No hay un borrador vinculado a una propiedad.");
         return;
      }
      try {
         const snapshot = await projectManager.getStore().loadPropertySnapshot(currentDraft.propertyId);
         const overrides = forceAll ? { touchedFields: [], overridesByPath: {}, hiddenEntities: [], ordering: {} } : currentOverrides;
         const state = resolveSiteConfig(currentDraft, overrides, snapshot);

         if (forceAll) setCurrentOverrides(overrides);
         setPresent(state);
         localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
         toast.success(forceAll ? "¡Sitio reiniciado desde RentikPro!" : "¡Sincronizado con RentikPro!");
      } catch (err) {
         console.error(err);
         toast.error("Error al sincronizar");
      }
   };

   const setState = useCallback(
      (next: PageState) => {
         setPresent(next);
         markDirty();
      },
      [setPresent, markDirty]
   );

   const setTemplate = useCallback(
      (t: PageState["meta"]["template"]) => {
         const next = createTemplate(t);
         setPresent(next);
         setSelectedId(next.blocks[0]?.id ?? null);
         setIsSaved(false);
         localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
         setIsSaved(true);
      },
      [setPresent]
   );

   const addBlock = useCallback(
      (type: BlockType, afterId?: string | null) => {
         const b = createBlock(type, pageHistory.present.meta.template);
         const blocks = pageHistory.present.blocks.slice();
         if (!afterId) {
            blocks.push(b);
         } else {
            const idx = blocks.findIndex((x) => x.id === afterId);
            blocks.splice(idx >= 0 ? idx + 1 : blocks.length, 0, b);
         }
         const next: PageState = { ...pageHistory.present, blocks, meta: { ...pageHistory.present.meta, updatedAt: now() } };
         setState(next);
         setSelectedId(b.id);
      },
      [pageHistory.present, setState]
   );

   const duplicateBlock = useCallback(() => {
      if (!selected) return;
      const copy: BlockNode = { ...deepClone(selected), id: uid() };
      const blocks = pageHistory.present.blocks.slice();
      const idx = blocks.findIndex((b) => b.id === selected.id);
      blocks.splice(idx + 1, 0, copy);
      setState({ ...pageHistory.present, blocks, meta: { ...pageHistory.present.meta, updatedAt: now() } });
      setSelectedId(copy.id);
   }, [selected, pageHistory.present, setState]);

   const deleteBlock = useCallback(() => {
      if (!selected) return;
      const blocks = pageHistory.present.blocks.filter((b) => b.id !== selected.id);
      const nextSelected = blocks[Math.max(0, blocks.length - 1)]?.id ?? null;
      setState({ ...pageHistory.present, blocks, meta: { ...pageHistory.present.meta, updatedAt: now() } });
      setSelectedId(nextSelected);
   }, [selected, pageHistory.present, setState]);

   const publishWeb = () => {
      const nowTs = now();
      const updated = {
         ...pageHistory.present,
         meta: { ...pageHistory.present.meta, publishedAt: nowTs },
      };
      setPresent(updated);
      localStorage.setItem("rentikpro.websiteBuilder.live.v1", JSON.stringify(updated));
      toast.success("¡Web publicada con éxito!");
   };

   const openLivePreview = () => {
      setIsPreviewOpen(true);
   };

   const moveSelected = useCallback(
      (dir: -1 | 1) => {
         if (!selected) return;
         const idx = pageHistory.present.blocks.findIndex((b) => b.id === selected.id);
         const to = clamp(idx + dir, 0, pageHistory.present.blocks.length - 1);
         if (to === idx) return;
         const blocks = moveItem(pageHistory.present.blocks, idx, to);
         setState({ ...pageHistory.present, blocks, meta: { ...pageHistory.present.meta, updatedAt: now() } });
      },
      [selected, pageHistory.present, setState]
   );

   const onDropToCanvas = useCallback(
      (e: React.DragEvent) => {
         e.preventDefault();
         const type = e.dataTransfer.getData("application/x-rentikpro-block") as BlockType;
         if (!type) return;
         addBlock(type, selectedId);
      },
      [addBlock, selectedId]
   );

   const canvasWidth = getDeviceWidth(device);

   const updateSelectedProps = useCallback(
      (patch: Record<string, any>) => {
         if (!selected) return;
         const blocks = pageHistory.present.blocks.map((b) => (b.id === selected.id ? applyPropsToBlock(b, patch) : b));
         setState({ ...pageHistory.present, blocks, meta: { ...pageHistory.present.meta, updatedAt: now() } });
      },
      [selected, pageHistory.present, setState]
   );

   const updateSelectedStyle = useCallback(
      (patch: Partial<BlockStyle>) => {
         if (!selected) return;
         const blocks = pageHistory.present.blocks.map((b) => (b.id === selected.id ? applyStyleToBlock(b, patch) : b));
         setState({ ...pageHistory.present, blocks, meta: { ...pageHistory.present.meta, updatedAt: now() } });
      },
      [selected, pageHistory.present, setState]
   );

   const resetDraft = useCallback(() => {
      const next = createTemplate(pageHistory.present.meta.template);
      setPresent(next);
      setSelectedId(next.blocks[0]?.id ?? null);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setIsSaved(true);
   }, [pageHistory.present.meta.template, setPresent]);
   const exportJson = useCallback(() => {
      const payload = JSON.stringify(pageHistory.present, null, 2);
      navigator.clipboard?.writeText(payload);
      alert("✅ JSON copiado al portapapeles");
   }, [pageHistory.present]);

   return (
      <div className="h-screen w-full bg-neutral-50 text-neutral-900">
         {/* Topbar */}
         <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50 shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-lg">
                     <Globe size={18} />
                  </div>
                  <div>
                     <div className="text-sm font-black tracking-tight leading-none">Website Builder</div>
                     <div className="text-[10px] text-neutral-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                        {pageHistory.present.meta.template} Pro
                        <span className="w-1 h-1 bg-neutral-200 rounded-full" />
                        {pageHistory.present.meta.publishedAt ? `Publicado ${new Date(pageHistory.present.meta.publishedAt).toLocaleTimeString()}` : "No publicado"}
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-black/5">
               {(["desktop", "tablet", "mobile"] as const).map((m) => (
                  <button
                     key={m}
                     className={`p-2 rounded-lg transition-all ${device === m ? "bg-white shadow-sm text-black scale-105" : "text-neutral-400 hover:text-black"}`}
                     onClick={() => setDevice(m)}
                  >
                     {m === "desktop" && <Monitor size={18} />}
                     {m === "tablet" && <Tablet size={18} />}
                     {m === "mobile" && <Smartphone size={18} />}
                  </button>
               ))}
               <div className="w-px h-4 bg-neutral-200 mx-1" />
               <button className="p-2 text-neutral-400 hover:text-black" onClick={() => setZoom(z => clamp(z - 0.1, 0.5, 1.5))}>
                  <Minus size={16} />
               </button>
               <button className="px-2 text-[11px] font-black text-neutral-600 hover:text-black min-w-[40px]" onClick={() => setZoom(1.0)}>
                  {Math.round(zoom * 100)}%
               </button>
               <button className="p-2 text-neutral-400 hover:text-black" onClick={() => setZoom(z => clamp(z + 0.1, 0.5, 1.5))}>
                  <Plus size={16} />
               </button>
            </div>

            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1 mr-2 bg-neutral-100 p-1 rounded-xl">
                  <button className="p-2 text-neutral-400 hover:text-black disabled:opacity-20" onClick={undo} disabled={pageHistory.past.length === 0}>
                     <HistoryIcon size={18} className="rotate-180" />
                  </button>
                  <button className="p-2 text-neutral-400 hover:text-black disabled:opacity-20" onClick={redo} disabled={pageHistory.future.length === 0}>
                     <HistoryIcon size={18} />
                  </button>
               </div>

               {currentDraft && (
                  <button
                     onClick={() => handleSync()}
                     className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors rounded-xl border border-indigo-100"
                     title="Sincronizar datos de RentikPro sin perder cambios manuales"
                  >
                     <RotateCw size={14} className="animate-spin-hover" />
                     Sincronizar
                  </button>
               )}

               <button onClick={openLivePreview} className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-black transition-colors rounded-xl border border-neutral-200 hover:border-black">
                  Ver web
               </button>
               <button onClick={publishWeb} className="px-5 py-2 text-xs font-bold bg-black text-white hover:bg-neutral-800 transition-all rounded-xl shadow-lg active:scale-95">
                  Publicar
               </button>
            </div>
         </header>

         <div className="flex-1 flex overflow-hidden">
            {/* Left: Block library */}
            <aside className="col-span-3 border-r border-neutral-200 bg-white flex flex-col overflow-hidden">
               <div className="p-3 border-b border-neutral-100">
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 ml-1">Nivel de Plantilla</div>
                  <div className="grid grid-cols-2 gap-1">
                     {(['BASIC', 'STANDARD', 'PRO', 'PRO_TOP'] as const).map(lvl => (
                        <button
                           key={lvl}
                           onClick={() => handleUpdateLevel(lvl)}
                           className={`px-2 py-2 rounded-xl text-[10px] font-black transition-all border ${currentDraft?.templateLevel === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-neutral-50 border-neutral-100 text-neutral-500 hover:bg-white hover:border-black'}`}
                        >
                           {lvl}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="p-3 border-b border-neutral-100">
                  <div className="text-sm font-bold flex items-center gap-2">
                     <LayoutPanelLeft size={16} className="text-black" />
                     Biblioteca Pro
                  </div>
                  <div className="mt-3 relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                     <input
                        type="text"
                        placeholder="Buscar bloques..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 ring-black/5 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                  </div>
                  <button
                     onClick={() => setIsCreateModalOpen(true)}
                     className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                     <Sparkles size={16} />
                     Crear desde RentikPro
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-3 space-y-6">
                  {CATEGORIES.map(cat => {
                     const filteredTypes = cat.types.filter(type =>
                        type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        BlockRegistry[type as BlockType].title.toLowerCase().includes(searchQuery.toLowerCase())
                     );

                     if (filteredTypes.length === 0) return null;

                     return (
                        <div key={cat.id} className="space-y-3">
                           <div className="flex items-center gap-2 px-1">
                              <cat.icon size={12} className="text-neutral-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{cat.label}</span>
                           </div>
                           <div className="grid gap-2">
                              {filteredTypes.map(t => (
                                 <div
                                    key={t}
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData("application/x-rentikpro-block", t)}
                                    onClick={() => addBlock(t as BlockType, selectedId)}
                                    className="group relative p-3 bg-neutral-50 border border-neutral-100 rounded-2xl hover:bg-white hover:border-black hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing"
                                 >
                                    <div className="flex items-center justify-between gap-2">
                                       <div className="text-[11px] font-bold text-neutral-800">{BlockRegistry[t as BlockType].title}</div>
                                       <Plus size={12} className="text-neutral-300 group-hover:text-black" />
                                    </div>
                                    <div className="text-[9px] text-neutral-400 mt-1 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       {BlockRegistry[t as BlockType].description}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     );
                  })}
               </div>

               <div className="p-4 bg-neutral-50 border-t border-neutral-200">
                  <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-neutral-200 shadow-sm">
                     <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center">
                        <Palette size={14} className="text-black" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-neutral-800">Ferrari Pro v2</div>
                        <div className="text-[9px] text-neutral-400 truncate">Premium Editor Active</div>
                     </div>
                  </div>
               </div>
            </aside>

            {/* Center: Canvas (Artboard) */}
            <main className="flex-1 bg-neutral-100 flex flex-col overflow-hidden relative">
               {/* Grid Background Pattern */}
               <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

               {/* Canvas toolbar */}
               <div className="z-20 px-4 py-2 bg-white/50 backdrop-blur-md border-b border-neutral-200/50 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5 p-1 bg-neutral-200/50 rounded-xl">
                        {(["desktop", "tablet", "mobile"] as const).map((m) => (
                           <button
                              key={m}
                              className={`p-1.5 rounded-lg transition-all ${device === m ? "bg-white text-black shadow-sm" : "hover:bg-white/50 text-neutral-500"}`}
                              onClick={() => setDevice(m)}
                              title={m.charAt(0).toUpperCase() + m.slice(1)}
                           >
                              {m === "desktop" && <Monitor size={14} />}
                              {m === "tablet" && <Tablet size={14} />}
                              {m === "mobile" && <Smartphone size={14} />}
                           </button>
                        ))}
                     </div>
                     <div className="h-4 w-px bg-neutral-300 mx-1" />
                     <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-tighter">
                        {canvasWidth} px
                     </div>
                  </div>

                  <div className="flex items-center gap-2">
                     <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black text-white text-[10px] font-bold hover:scale-105 transition-transform" onClick={() => (setPresent(createTemplate("Minimal")), toast.success("Canvas Reset"))}>
                        <RotateCcw size={12} />
                        Limpiar Canvas
                     </button>
                  </div>
               </div>

               {/* Scrollable area for the artboard */}
               <div className="flex-1 overflow-auto p-12 flex items-start justify-center relative z-10 scrollbar-hide no-scrollbar" onDragOver={(e) => e.preventDefault()} onDrop={onDropToCanvas}>
                  <div
                     className="transition-all duration-300 ease-out origin-top"
                     style={{
                        width: canvasWidth,
                        transform: `scale(${zoom})`,
                        marginBottom: '400px' // Space at bottom
                     }}
                  >
                     {/* Device Shell */}
                     <div className={`
                        relative bg-white shadow-2xl transition-all duration-500
                        ${device === 'mobile' ? 'rounded-[3rem] ring-8 ring-neutral-900 overflow-hidden' : 'rounded-2xl border border-neutral-200 shadow-neutral-300/50'}
                     `}>
                        {/* Mobile Notch UI */}
                        {device === 'mobile' && (
                           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-900 rounded-b-2xl z-40 flex items-end justify-center pb-1">
                              <div className="w-10 h-1 bg-neutral-800 rounded-full" />
                           </div>
                        )}

                        {/* Actual Builder Content */}
                        <div className="min-h-[800px] flex flex-col">
                           {pageHistory.present.blocks.map((b) => {
                              const isSel = b.id === selectedId;
                              return (
                                 <div
                                    key={b.id}
                                    onClick={(e) => (e.stopPropagation(), setSelectedId(b.id))}
                                    className={`relative group/block transition-all ${isSel ? "z-30 ring-2 ring-black ring-offset-0" : "hover:ring-1 hover:ring-neutral-200"}`}
                                 >
                                    {/* Advanced Selection Helper (Labels & Icons) */}
                                    {isSel && (
                                       <div className="absolute -top-3 left-6 z-40 bg-black text-white text-[9px] font-black px-2 py-1 rounded-md shadow-xl flex items-center gap-1.5">
                                          <Sparkles size={8} />
                                          {b.type.toUpperCase()}
                                       </div>
                                    )}

                                    {/* Action bar (Floating) */}
                                    {isSel && (
                                       <div className="absolute -right-12 top-0 h-full flex flex-col gap-1 items-center py-2 z-40">
                                          <div className="p-1 bg-white border border-neutral-200 rounded-xl shadow-xl space-y-1">
                                             <button className="p-2 rounded-lg hover:bg-neutral-50 text-neutral-500 hover:text-black transition-colors" onClick={(e) => (e.stopPropagation(), moveSelected(-1))} title="Mover Arriba">
                                                <ChevronDown className="rotate-180" size={14} />
                                             </button>
                                             <button className="p-2 rounded-lg hover:bg-neutral-50 text-neutral-500 hover:text-black transition-colors" onClick={(e) => (e.stopPropagation(), moveSelected(1))} title="Mover Abajo">
                                                <ChevronDown size={14} />
                                             </button>
                                             <div className="h-px w-4 bg-neutral-200 mx-auto" />
                                             <button className="p-2 rounded-lg hover:bg-neutral-50 text-neutral-500 hover:text-black transition-colors" onClick={(e) => (e.stopPropagation(), duplicateBlock())} title="Duplicar">
                                                <Copy size={14} />
                                             </button>
                                             <button className="p-2 rounded-lg hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors" onClick={(e) => (e.stopPropagation(), deleteBlock())} title="Borrar">
                                                <Trash2 size={14} />
                                             </button>
                                          </div>
                                       </div>
                                    )}

                                    <div className={`${getEffectiveStyle(b, device).border ?? ""} ${getEffectiveStyle(b, device).rounded ?? ""} ${getEffectiveStyle(b, device).shadow ?? ""}`}>
                                       {BlockRegistry[b.type].render({
                                          ...b,
                                          style: getEffectiveStyle(b, device)
                                       })}
                                    </div>
                                 </div>
                              );
                           })}

                           {/* Empty state hint */}
                           {pageHistory.present.blocks.length === 0 && (
                              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-30">
                                 <LayoutPanelLeft size={48} className="mb-4" />
                                 <div className="text-xl font-bold">Canvas Vacío</div>
                                 <div className="text-sm">Arrastra bloques aquí para empezar</div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </main>

            {/* Right: Inspector */}
            <aside className="col-span-3 border-l border-neutral-200 bg-white overflow-auto">
               <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                     <div>
                        <div className="text-sm font-semibold">Inspector</div>
                        <div className="text-xs opacity-70 mt-1">{selected ? `${selected.type} · ${selected.id}` : "Selecciona un bloque"}</div>
                     </div>
                     <div className="text-xs px-2 py-1 rounded-xl border border-neutral-200 bg-neutral-50">{isSaved ? "OK" : "..."}</div>
                  </div>

                  {/* Tabs */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                     <button
                        className={`px-3 py-2 rounded-xl border text-sm ${tab === "content" ? "bg-black text-white border-black" : "bg-white border-neutral-200"}`}
                        onClick={() => setTab("content")}
                     >
                        Content
                     </button>
                     <button
                        className={`px-3 py-2 rounded-xl border text-sm ${tab === "style" ? "bg-black text-white border-black" : "bg-white border-neutral-200"}`}
                        onClick={() => setTab("style")}
                     >
                        Style
                     </button>
                     <button
                        className={`px-3 py-2 rounded-xl border text-sm ${tab === "responsive" ? "bg-black text-white border-black" : "bg-white border-neutral-200"}`}
                        onClick={() => setTab("responsive")}
                     >
                        Responsive
                     </button>
                  </div>

                  {!selected && (
                     <div className="mt-4 p-4 rounded-2xl border border-neutral-200 bg-neutral-50 text-sm opacity-80">
                        Selecciona un bloque en el canvas para editarlo.
                     </div>
                  )}

                  {selected && tab === "content" && (
                     <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-2xl border border-neutral-200">
                           <div className="text-xs font-semibold">Campos</div>
                           <div className="mt-3 space-y-3">
                              {BlockRegistry[selected.type].contentFields.map((f) => {
                                 const val = selected.props?.[f.key] ?? "";
                                 if (f.type === "textarea") {
                                    return (
                                       <label key={f.key} className="block">
                                          <div className="text-xs opacity-70">{f.label}</div>
                                          <textarea
                                             className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 min-h-[90px]"
                                             value={val}
                                             onChange={(e) => updateSelectedProps({ [f.key]: e.target.value })}
                                          />
                                       </label>
                                    );
                                 }
                                 return (
                                    <label key={f.key} className="block">
                                       <div className="text-xs opacity-70">{f.label}</div>
                                       <input
                                          className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200"
                                          value={val}
                                          onChange={(e) => updateSelectedProps({ [f.key]: e.target.value })}
                                       />
                                    </label>
                                 );
                              })}
                              {BlockRegistry[selected.type].arrayFields?.map((af) => (
                                 <ArrayEditor
                                    key={af.key}
                                    field={af}
                                    value={selected.props[af.key] ?? []}
                                    onChange={(next) => updateSelectedProps({ [af.key]: next })}
                                 />
                              ))}
                           </div>
                        </div>
                     </div>
                  )}

                  {selected && tab === "style" && (
                     <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-2xl border border-black/5 bg-black/[0.02]">
                           <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Estilos Preestablecidos</div>
                           <div className="grid grid-cols-2 gap-2">
                              {[
                                 { name: 'Soft', style: { rounded: 'rounded-3xl', border: 'border-neutral-100', shadow: 'shadow-xl shadow-black/5', background: 'bg-white' } },
                                 { name: 'Sharp', style: { rounded: 'rounded-none', border: 'border-neutral-900', shadow: 'shadow-none', background: 'bg-white' } },
                                 { name: 'Luxury', style: { rounded: 'rounded-md', border: 'border-neutral-200', shadow: 'shadow-2xl', background: 'bg-white' } },
                                 { name: 'Rustic', style: { rounded: 'rounded-[2rem]', border: 'border-stone-200', shadow: 'shadow-md', background: 'bg-stone-50' } }
                              ].map(p => (
                                 <button
                                    key={p.name}
                                    className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-[11px] font-bold hover:border-black transition-all flex items-center justify-between group"
                                    onClick={() => updateSelectedStyle(p.style)}
                                 >
                                    {p.name}
                                    <Sparkles size={10} className="text-neutral-200 group-hover:text-black" />
                                 </button>
                              ))}
                           </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-neutral-200">
                           <div className="text-xs font-semibold">Alineación</div>
                           <div className="mt-2 grid grid-cols-3 gap-2">
                              {(["left", "center", "right"] as const).map((a) => (
                                 <button
                                    key={a}
                                    className={`px-3 py-2 rounded-xl border text-sm transition-all ${selected.style.align === a ? "bg-black text-white border-black" : "bg-white border-neutral-200 hover:border-neutral-300"}`}
                                    onClick={() => updateSelectedStyle({ align: a })}
                                 >
                                    {a}
                                 </button>
                              ))}
                           </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-neutral-200">
                           <div className="text-xs font-semibold">Max width</div>
                           <div className="mt-2 grid grid-cols-3 gap-2">
                              {(["screen", "prose", "full"] as const).map((mw) => (
                                 <button
                                    key={mw}
                                    className={`px-3 py-2 rounded-xl border text-sm transition-all ${selected.style.maxWidth === mw ? "bg-black text-white border-black" : "bg-white border-neutral-200 hover:border-neutral-300"}`}
                                    onClick={() => updateSelectedStyle({ maxWidth: mw })}
                                 >
                                    {mw}
                                 </button>
                              ))}
                           </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-neutral-200 space-y-3">
                           <div className="text-xs font-semibold">Propiedades Pro</div>

                           <label className="block">
                              <div className="text-xs opacity-70 mb-1">Background</div>
                              <input
                                 className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50 focus:bg-white focus:ring-2 ring-black/5 outline-none transition-all"
                                 value={selected.style.background ?? ""}
                                 onChange={(e) => updateSelectedStyle({ background: e.target.value })}
                                 placeholder="ej: bg-white"
                              />
                           </label>
                           <label className="block">
                              <div className="text-xs opacity-70 mb-1">Texto</div>
                              <input
                                 className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50 focus:bg-white focus:ring-2 ring-black/5 outline-none transition-all"
                                 value={selected.style.text ?? ""}
                                 onChange={(e) => updateSelectedStyle({ text: e.target.value })}
                                 placeholder="ej: text-neutral-900"
                              />
                           </label>
                           <label className="block">
                              <div className="text-xs opacity-70 mb-1">Padding</div>
                              <input
                                 className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50 focus:bg-white focus:ring-2 ring-black/5 outline-none transition-all"
                                 value={selected.style.padding ?? ""}
                                 onChange={(e) => updateSelectedStyle({ padding: e.target.value })}
                                 placeholder="ej: py-20 px-8"
                              />
                           </label>
                           <div className="grid grid-cols-2 gap-2">
                              <label className="block">
                                 <div className="text-xs opacity-70 mb-1">Borde</div>
                                 <input
                                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50 focus:bg-white focus:ring-2 ring-black/5 outline-none transition-all"
                                    value={selected.style.border ?? ""}
                                    onChange={(e) => updateSelectedStyle({ border: e.target.value })}
                                    placeholder="border-2"
                                 />
                              </label>
                              <label className="block">
                                 <div className="text-xs opacity-70 mb-1">Redondeado</div>
                                 <input
                                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50 focus:bg-white focus:ring-2 ring-black/5 outline-none transition-all"
                                    value={selected.style.rounded ?? ""}
                                    onChange={(e) => updateSelectedStyle({ rounded: e.target.value })}
                                    placeholder="rounded-3xl"
                                 />
                              </label>
                           </div>
                           <label className="block">
                              <div className="text-xs opacity-70 mb-1">Sombra</div>
                              <input
                                 className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50 focus:bg-white focus:ring-2 ring-black/5 outline-none transition-all"
                                 value={selected.style.shadow ?? ""}
                                 onChange={(e) => updateSelectedStyle({ shadow: e.target.value })}
                                 placeholder="shadow-2xl shadow-black/10"
                              />
                           </label>
                        </div>
                     </div>
                  )}

                  {selected && tab === "responsive" && (
                     <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-2xl border border-neutral-200">
                           <div className="text-xs font-semibold">Vista previa</div>
                           <div className="mt-2 text-sm opacity-80">
                              Cambia el modo arriba (Desktop/Tablet/Mobile). El canvas ajusta el ancho real.
                           </div>
                        </div>
                        <div className="p-4 rounded-2xl border border-neutral-200">
                           <div className="text-xs font-semibold">Sugerencia</div>
                           <div className="mt-2 text-sm opacity-80">
                              En la siguiente iteración añadimos overrides por breakpoint (props/style por device).
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </aside>
         </div>

         {/* Preview Modal */}
         {isPreviewOpen && (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col">
               <div className="h-16 border-b border-neutral-200 flex items-center justify-between px-6 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                     <span className="text-sm font-bold">Vista Previa Real</span>
                     <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">Live</span>
                  </div>
                  <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                     <X size={20} />
                  </button>
               </div>
               <div className="flex-1 overflow-auto bg-neutral-50 p-8 flex justify-center">
                  <div className="w-full max-w-6xl bg-white shadow-2xl rounded-2xl overflow-hidden min-h-full">
                     {pageHistory.present.blocks.map(b => (
                        <div key={b.id}>
                           {BlockRegistry[b.type].render(b)}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {/* --- CREATE SITE MODAL --- */}
         {isCreateModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-8 pb-4">
                     <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                           <Sparkles size={24} />
                        </div>
                        <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                           <X size={20} />
                        </button>
                     </div>
                     <h2 className="text-2xl font-black tracking-tight mb-2">Crear desde RentikPro</h2>
                     <p className="text-neutral-500 text-sm leading-relaxed mb-8">
                        Genera un sitio web automáticamente usando tus alojamientos, fotos y configuraciones actuales. <b>Sin IA, datos 100% reales.</b>
                     </p>

                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Selecciona Propiedad</label>
                           <select
                              value={selectedPropertyId}
                              onChange={(e) => setSelectedPropertyId(e.target.value)}
                              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 ring-indigo-50 outline-none transition-all cursor-pointer"
                           >
                              <option value="">Elegir una propiedad...</option>
                              {properties.map(p => (
                                 <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                           </select>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nivel de Plantilla</label>
                           <div className="grid grid-cols-2 gap-2">
                              {(['BASIC', 'STANDARD', 'PRO', 'PRO_TOP'] as const).map(lvl => (
                                 <button
                                    key={lvl}
                                    onClick={() => setActiveTemplateLevel(lvl)}
                                    className={`px-4 py-3 rounded-2xl text-xs font-black transition-all border ${activeTemplateLevel === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:bg-white hover:border-black'}`}
                                 >
                                    {lvl}
                                 </button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-8 pt-4">
                     <button
                        onClick={handleCreateSite}
                        disabled={!selectedPropertyId}
                        className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm shadow-xl hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                     >
                        Generar Sitio Ahora
                     </button>
                     <p className="text-center text-[10px] text-neutral-400 mt-4 font-bold uppercase tracking-widest">
                        Esto reemplazará el borrador actual
                     </p>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};