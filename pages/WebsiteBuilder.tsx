
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { projectManager } from '../services/projectManager';
import { WebSite, Property, Apartment, MediaAsset } from '../types';
import { useDataRefresh } from '../services/dataRefresher';
import { PromptBuilder } from '../components/PromptBuilder';
import { QuickWebWizard } from '../components/QuickWebWizard';
import {
   LayoutTemplate, Code, Save, ArrowLeft, Loader2, Plus, Trash2, GripVertical, Image as ImageIcon, Upload, Monitor, Smartphone, Globe, Eye, MoreVertical, X, Check, ChevronRight, AlertCircle, CheckCircle2, FileCode, Package, RefreshCw, Calendar, Sparkles, Edit2, Play, ImagePlus, ChevronLeft, Maximize2, List, ToggleRight, ArrowRight, Laptop, Download, Link, Rocket, Cloud, FileDown, Import, ExternalLink, Settings, Type, Palette, MousePointer, Search, Copy, Bot, ToggleLeft, Zap, MapPin, Wrench, CreditCard, Megaphone, History, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { ManualPublishModal } from '../components/ManualPublishModal';
import { TemplateId } from '../services/promptTemplates';

const SECTIONS_DEFAULT = [
   { id: 'hero', type: 'hero', content: { title: 'Bienvenido a tu Refugio', subtitle: 'Descubre nuestros alojamientos únicos.', bg_image: '' } },
   { id: 'properties', type: 'properties', content: { title: 'Nuestras Casas' } },
   { id: 'about', type: 'text', content: { title: 'Sobre Nosotros', body: 'Llevamos 10 años ofreciendo experiencias inolvidables en el mundo rural.' } },
   { id: 'contact', type: 'contact', content: { email: 'info@ejemplo.com', phone: '+34 600 000 000' } }
];

// --- MAIN PAGE COMPONENT ---

export const WebsiteBuilder: React.FC = () => {
   const navigate = useNavigate();
   const [websites, setWebsites] = useState<WebSite[]>([]);
   const [selectedSite, setSelectedSite] = useState<WebSite | null>(null);
   const [previewSite, setPreviewSite] = useState<WebSite | null>(null);
   const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
   const [isQuickWebModalOpen, setIsQuickWebModalOpen] = useState(false);
   const [isManualPublishModalOpen, setIsManualPublishModalOpen] = useState(false);
   const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');

   // Media State
   const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
   const [activeTab, setActiveTab] = useState<'CONFIG' | 'MEDIA'>('CONFIG');

   // Drag Drop State
   const [dragOverSection, setDragOverSection] = useState<string | null>(null); // Changed to string ID (e.g. "0-2" for sec 0 item 2, or "0" for sec 0)

   // Status Toast State
   const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

   // Auto-hide toast
   useEffect(() => {
      if (toast) {
         const timer = setTimeout(() => setToast(null), 3000);
         return () => clearTimeout(timer);
      }
   }, [toast]);

   // Media Selector Modal State
   const [mediaSelectorTarget, setMediaSelectorTarget] = useState<{ index: number, field?: string, assetId?: string, itemIndex?: number } | null>(null);

   // Publish / Export Modal State
   const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
   const [publishSlug, setPublishSlug] = useState("");
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);

   // JSON Editor State
   const [jsonError, setJsonError] = useState<string | null>(null);
   const [isAdvancedMode, setIsAdvancedMode] = useState(false);
   const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
   const [isSingleViewMode, setIsSingleViewMode] = useState(true);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const zipInputRef = useRef<HTMLInputElement>(null);

   const loadWebsites = useCallback(async () => {
      const list = await projectManager.getStore().getWebsites();
      setWebsites(list);
   }, []);

   const loadMedia = useCallback(async () => {
      if (selectedSite) {
         const media = await projectManager.getStore().getSiteMedia(selectedSite.id);
         setMediaAssets(media);
      }
   }, [selectedSite]);

   // Original state for dirty checking
   const [originalSite, setOriginalSite] = useState<WebSite | null>(null);
   const [lastSaved, setLastSaved] = useState<number | null>(null);

   const hasChanges = useMemo(() => {
      if (!selectedSite || !originalSite) return false;
      // Simple deep comparison
      return JSON.stringify(selectedSite) !== JSON.stringify(originalSite);
   }, [selectedSite, originalSite]);

   useEffect(() => { loadWebsites(); }, [loadWebsites]);
   useEffect(() => { loadMedia(); }, [loadMedia]);
   useDataRefresh(loadWebsites);

   const sections = useMemo(() => {
      try {
         const parsed = JSON.parse(selectedSite?.sections_json || '[]');
         return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
   }, [selectedSite?.sections_json]);

   const previewSections = useMemo(() => {
      try {
         const parsed = JSON.parse(previewSite?.sections_json || '[]');
         return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
   }, [previewSite?.sections_json]);

   const handleCreate = async () => {
      const newSite: WebSite = {
         id: crypto.randomUUID(),
         name: 'Nueva Web',
         subdomain: `site-${Date.now().toString(36).slice(-6)}`,
         status: 'draft',
         theme_config: { primary_color: '#4F46E5', font_family: 'Inter', layout_mode: 'modern' },
         seo_title: '',
         seo_description: '',
         sections_json: JSON.stringify(SECTIONS_DEFAULT, null, 2),
         booking_config: { min_stay: 2, max_stay: 30, advance_notice_days: 1, check_in_time: '15:00', check_out_time: '11:00' },
         property_ids_json: '[]',
         created_at: Date.now(),
         updated_at: Date.now()
      };
      await projectManager.getStore().saveWebsite(newSite);
      loadWebsites();
      setSelectedSite(newSite);
      setOriginalSite(newSite);
   };

   const handleSave = async () => {
      if (!selectedSite) return;
      try {
         // Validate JSON
         JSON.parse(selectedSite.sections_json);
         const updated = { ...selectedSite, updated_at: Date.now() };
         await projectManager.getStore().saveWebsite(updated);

         // Update states
         setSelectedSite(updated);
         setOriginalSite(updated);
         setLastSaved(Date.now());
         setJsonError(null);
         loadWebsites();
      } catch (e) {
         alert("Error: JSON inválido. Revisa la sintaxis.");
      }
   };

   const handleDelete = async (id: string) => {
      if (confirm("¿Eliminar sitio web? Esta acción es irreversible.")) {
         await projectManager.getStore().deleteWebsite(id);
         loadWebsites();
         if (selectedSite?.id === id) setSelectedSite(null);
      }
   };

   const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.zip')) {
         alert("Por favor, selecciona un archivo .zip");
         return;
      }

      try {
         const reader = new FileReader();
         reader.onload = async (evt) => {
            const base64 = (evt.target?.result as string).split(',')[1];

            const newSite: WebSite = {
               id: crypto.randomUUID(),
               name: file.name.replace('.zip', ''),
               subdomain: `imported-${Date.now().toString(36).slice(-6)}`,
               status: 'imported',
               theme_config: { primary_color: '#4F46E5' },
               seo_title: file.name,
               seo_description: 'Sito web importado',
               sections_json: '[]', // Not used for imported sites
               booking_config: { min_stay: 2 },
               property_ids_json: '["default"]', // Default property
               zip_base64: base64,
               created_at: Date.now(),
               updated_at: Date.now()
            };

            await projectManager.getStore().saveWebsite(newSite);
            loadWebsites();
            setSelectedSite(newSite);
            setToast({ text: "Web importada correctamente", type: "success" });
         };
         reader.readAsDataURL(file);
      } catch (err) {
         console.error(err);
         alert("Error al importar el ZIP.");
      }
   };

   // ZIP PREVIEW EFFECT
   useEffect(() => {
      const loadZipPreview = async () => {
         if (selectedSite?.status === 'imported' && selectedSite.zip_base64) {
            try {
               const zip = new JSZip();
               const content = await zip.loadAsync(selectedSite.zip_base64, { base64: true });

               // Find index.html
               let indexFile = Object.values(content.files).find(f => f.name.toLowerCase().endsWith('index.html'));
               // Fallback to searching first html if no index.html
               if (!indexFile) {
                  indexFile = Object.values(content.files).find(f => f.name.toLowerCase().endsWith('.html'));
               }

               if (!indexFile) {
                  setToast({ text: "No se encontró index.html en el ZIP", type: "error" });
                  return;
               }

               let html = await indexFile.async('string');

               // Create Blobs for assets and replace paths
               const blobUrls: Record<string, string> = {};
               const assetFiles = Object.values(content.files).filter(f => !f.dir && !f.name.endsWith('index.html'));

               for (const file of assetFiles) {
                  const blob = await file.async('blob');
                  // Simple MIME inference
                  let type = '';
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  if (ext === 'css') type = 'text/css';
                  if (ext === 'js') type = 'application/javascript';
                  if (ext === 'png') type = 'image/png';
                  if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
                  if (ext === 'svg') type = 'image/svg+xml';

                  const url = URL.createObjectURL(new Blob([blob], { type }));
                  blobUrls[file.name] = url;
               }

               // Replace relative paths in HTML
               // Sort keys by length desc to avoid partial replacement issues
               const keys = Object.keys(blobUrls).sort((a, b) => b.length - a.length);
               for (const filename of keys) {
                  // Replace exact matches of filenames (supporting quotes)
                  // We use global replacement
                  html = html.split(filename).join(blobUrls[filename]);
               }

               // INJECT BOOKING BUTTON
               // Get default property ID or use placeholder
               const propId = selectedSite.property_ids_json ? (JSON.parse(selectedSite.property_ids_json)[0] || 'default') : 'default';
               const bookingLink = `#`; // In a real app this would go to /booking engine. For now we just put a link.
               // Actually user said: "/booking (ruta de tu motor)"
               const fullBookingLink = `/booking?propertyId=${propId}`;

               const buttonHtml = `<div style="position:fixed;bottom:20px;right:20px;z-index:9999;"><a href="${fullBookingLink}" class="rentik-booking-btn" style="background:${selectedSite.theme_config.primary_color || '#4F46E5'};color:white;padding:12px 24px;border-radius:99px;font-weight:bold;text-decoration:none;box-shadow:0 10px 25px rgba(0,0,0,0.2);font-family:system-ui;display:flex;align-items:center;gap:8px;font-size:14px;">📅 Reservar Ahora</a></div>`;

               if (html.includes('<!-- RENTIKPRO_BOOKING_BUTTON -->')) {
                  html = html.replace('<!-- RENTIKPRO_BOOKING_BUTTON -->', buttonHtml);
               } else {
                  // Append to body
                  html = html.replace('</body>', `${buttonHtml}</body>`);
               }

               const indexBlob = new Blob([html], { type: 'text/html' });
               const indexUrl = URL.createObjectURL(indexBlob);
               setPreviewUrl(indexUrl);

            } catch (err) {
               console.error("Error loading ZIP preview", err);
               setToast({ text: "Error generando vista previa", type: "error" });
            }
         } else {
            setPreviewUrl(null);
         }
      };

      loadZipPreview();

      return () => {
         // Cleanup blobs if needed, though they persist for the session usually.
         // Could track and revoke.
      };
   }, [selectedSite]);

   const updateSectionJson = (val: string) => {
      if (selectedSite) {
         setSelectedSite({ ...selectedSite, sections_json: val });
         try {
            JSON.parse(val);
            setJsonError(null);
         } catch (e) {
            setJsonError("Sintaxis JSON inválida");
         }
      }
   };

   const updateSectionContent = (index: number, field: string, value: any) => {
      if (!selectedSite) return;
      try {
         const newSections = JSON.parse(selectedSite.sections_json);
         if (!newSections[index]) return;
         if (!newSections[index].content) newSections[index].content = {};

         newSections[index].content[field] = value;

         const updatedJson = JSON.stringify(newSections, null, 2);
         setSelectedSite({ ...selectedSite, sections_json: updatedJson });
         setJsonError(null);
      } catch (e) {
         console.error("Error updating section content", e);
      }
   };

   // --- MEDIA LOGIC ---
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedSite || !e.target.files) return;
      const files = Array.from(e.target.files);

      for (const file of files) {
         const reader = new FileReader();
         reader.onload = async (evt) => {
            const base64 = evt.target?.result as string;
            const asset: MediaAsset = {
               id: crypto.randomUUID(),
               site_id: selectedSite.id,
               filename: file.name,
               mime_type: file.type,
               size: file.size,
               data_base64: base64,
               created_at: Date.now()
            };
            await projectManager.getStore().saveMedia(asset);
         };
         reader.readAsDataURL(file);
      }

      // Allow a bit of time for async reads
      setTimeout(loadMedia, 500);
      // Clear input
      e.target.value = '';
   };

   const handleDeleteMedia = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm("¿Eliminar imagen?")) {
         await projectManager.getStore().deleteMedia(id);
         loadMedia();
      }
   };

   const copyMediaLink = (id: string) => {
      const link = `media://${id}`;
      navigator.clipboard.writeText(link);
      alert("Enlace copiado: " + link);
   };

   const resolveMedia = (url?: string) => {
      if (!url) return undefined;
      if (url.startsWith('media://')) {
         const id = url.replace('media://', '');
         const asset = mediaAssets.find(a => a.id === id);
         return asset ? asset.data_base64 : undefined; // Fallback or placeholder?
      }
      return url;
   };

   // --- DRAG AND DROP ON SECTIONS ---

   // --- DRAG AND DROP ON SECTIONS ---

   const handleSectionDrop = async (e: React.DragEvent, sectionIndex: number, itemIndex?: number) => {
      e.preventDefault();
      setDragOverSection(null);

      if (!selectedSite || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return;

      // 1. Upload
      const reader = new FileReader();
      reader.onload = async (evt) => {
         const base64 = evt.target?.result as string;

         // Extract dimensions
         const img = new Image();
         img.onload = async () => {
            const asset: MediaAsset = {
               id: crypto.randomUUID(),
               site_id: selectedSite.id,
               filename: file.name,
               mime_type: file.type,
               size: file.size,
               data_base64: base64,
               width: img.width,
               height: img.height,
               created_at: Date.now()
            };
            await projectManager.getStore().saveMedia(asset);
            loadMedia();

            // If we are dropping onto a section, continue with assignment
            if (sectionIndex !== undefined) {
               // 2. Assign to Section
               const newSections = JSON.parse(selectedSite.sections_json);
               const targetSection = newSections[sectionIndex];
               const mediaLink = `media://${asset.id}`;
               let successMsg = "";

               // Auto-mapping logic
               if (targetSection.type === 'hero') {
                  targetSection.content.bg_image = mediaLink;
                  successMsg = "Fondo de Hero actualizado";
               } else if (targetSection.type === 'gallery') {
                  if (!targetSection.content.images) targetSection.content.images = [];

                  if (itemIndex !== undefined) {
                     // Replace specific image
                     targetSection.content.images[itemIndex] = mediaLink;
                     successMsg = "Imagen de galería actualizada";
                  } else {
                     // Append
                     targetSection.content.images.push(mediaLink);
                     successMsg = "Imagen añadida a galería";
                  }
               } else if (targetSection.type === 'properties') {
                  if (!targetSection.content.cards) {
                     // Init default cards if not exists
                     targetSection.content.cards = [{}, {}, {}];
                  }

                  if (itemIndex !== undefined) {
                     if (!targetSection.content.cards[itemIndex]) targetSection.content.cards[itemIndex] = {};
                     targetSection.content.cards[itemIndex].image = mediaLink;
                     successMsg = `Imagen de Propiedad ${itemIndex + 1} actualizada`;
                  } else {
                     // Fallback: set as general bg? Or ignore?
                     targetSection.content.bg_image = mediaLink;
                     successMsg = "Fondo de sección propiedades actualizado";
                  }
               } else if (targetSection.type === 'contact' || targetSection.type === 'text') {
                  targetSection.content.cover_image = mediaLink;
                  if (!targetSection.content.cover_image) targetSection.content.image = mediaLink;
                  successMsg = "Imagen de portada actualizada";
               } else {
                  targetSection.content.image = mediaLink;
                  targetSection.content.bg_image = mediaLink;
                  successMsg = "Imagen actualizada";
               }

               const updatedJson = JSON.stringify(newSections, null, 2);
               updateSectionJson(updatedJson);
               setToast({ text: successMsg, type: 'success' });
            }
         };
         img.src = base64;

      };
      reader.readAsDataURL(file);
   };

   // --- MEDIA SELECTOR LOGIC ---

   const handleMediaSelect = (asset: MediaAsset) => {
      if (!mediaSelectorTarget || !selectedSite) return;

      const { index, itemIndex } = mediaSelectorTarget;
      const newSections = JSON.parse(selectedSite.sections_json);
      const targetSection = newSections[index];
      const mediaLink = `media://${asset.id}`;
      let successMsg = "";

      // Logic mirrored from handleSectionDrop
      if (targetSection.type === 'hero') {
         targetSection.content.bg_image = mediaLink;
         successMsg = "Fondo de Hero actualizado";
      } else if (targetSection.type === 'gallery') {
         if (!targetSection.content.images) targetSection.content.images = [];

         if (itemIndex !== undefined) {
            targetSection.content.images[itemIndex] = mediaLink;
            successMsg = "Imagen de galería actualizada";
         } else {
            targetSection.content.images.push(mediaLink);
            successMsg = "Imagen añadida a galería";
         }
      } else if (targetSection.type === 'properties') {
         if (!targetSection.content.cards) targetSection.content.cards = [{}, {}, {}];
         if (itemIndex !== undefined) {
            if (!targetSection.content.cards[itemIndex]) targetSection.content.cards[itemIndex] = {};
            targetSection.content.cards[itemIndex].image = mediaLink;
            successMsg = `Imagen de Propiedad ${itemIndex + 1} actualizada`;
         } else {
            targetSection.content.bg_image = mediaLink; // Fallback
         }
      } else if (targetSection.type === 'contact' || targetSection.type === 'text') {
         targetSection.content.cover_image = mediaLink;
         if (!targetSection.content.cover_image) targetSection.content.image = mediaLink;
         successMsg = "Imagen actualizada";
      } else {
         targetSection.content.image = mediaLink;
         targetSection.content.bg_image = mediaLink;
         successMsg = "Imagen actualizada";
      }

      const updatedJson = JSON.stringify(newSections, null, 2);
      updateSectionJson(updatedJson);
      setToast({ text: successMsg, type: 'success' });
      setMediaSelectorTarget(null); // Close modal
   };

   // --- EXPORT logic ---

   // 1. Export standard JSON spec
   const handleExportWebSpec = () => {
      if (!selectedSite) return;
      try {
         const webSpec = {
            meta: { generator: "RentikPro Create2Web", version: "1.0" },
            name: selectedSite.name,
            subdomain: selectedSite.subdomain,
            theme_config: selectedSite.theme_config,
            booking_config: selectedSite.booking_config,
            seo: {
               title: selectedSite.seo_title,
               description: selectedSite.seo_description
            },
            sections: JSON.parse(selectedSite.sections_json)
         };

         const blob = new Blob([JSON.stringify(webSpec, null, 2)], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `webspec-${selectedSite.subdomain}.json`;
         a.click();
         URL.revokeObjectURL(url);
      } catch (e) {
         alert("Error al exportar: Revisa que el JSON de secciones sea válido.");
      }
   };

   // 2. Export PUBLISHABLE ZIP (Standalone)
   const handleOpenPublishModal = () => {
      if (selectedSite) {
         setPublishSlug(selectedSite.subdomain);
         setIsPublishModalOpen(true);
      }
   };

   const handleConfirmedExportZip = async () => {
      if (!selectedSite) return;
      const slug = publishSlug || selectedSite.subdomain;

      try {
         const zip = new JSZip();
         // ROOT FOLDER NAME IS NOW DYNAMIC BASED ON SLUG
         const root = zip.folder(slug);
         if (!root) return;

         // --- A. ASSETS / MEDIA ---
         const mediaFolder = root.folder("media");
         const assetsFolder = root.folder("assets");

         // 1. Save all media used/unused (or filter if preferred)
         // Mapping for replacement: id -> filename
         const mediaMap: Record<string, string> = {};

         mediaAssets.forEach(asset => {
            const ext = asset.mime_type.split('/')[1] || 'png';
            const filename = `${asset.id}.${ext}`;
            const base64Data = asset.data_base64.split(',')[1];

            if (mediaFolder) mediaFolder.file(filename, base64Data, { base64: true });
            mediaMap[asset.id] = `media/${filename}`;
         });

         // --- B. CLEAN WEBSPEC JSON ---
         // Replace media://id with ./media/filename.ext
         let jsonString = selectedSite.sections_json;

         // 1. Replace known assets
         Object.keys(mediaMap).forEach(id => {
            // Global replace using split/join to allow for all instances
            // mediaMap[id] is relative path e.g. "media/file.jpg"
            // User requested "./media/file.jpg"
            const relativePath = `./${mediaMap[id]}`;
            jsonString = jsonString.split(`media://${id}`).join(relativePath);
         });

         // 2. Fallback for missing assets (Validation)
         // If jsonString still contains "media://", those IDs don't exist in mediaAssets
         if (jsonString.includes("media://")) {
            console.warn("Export Warning: Some media assets referenced in JSON were not found in the database.");
            // Regex to find occurrences of media://[UUID or string]
            // We replace them with an empty string or a placeholder to prevent broken 404 links trying to load "media://..."
            jsonString = jsonString.replace(/media:\/\/[a-zA-Z0-9-]+/g, "");
         }

         // Also replace in main config if needed (e.g. SEO image?)

         const webSpec = {
            meta: { generator: "RentikPro Create2Web", version: "1.0" },
            site_info: {
               name: selectedSite.name,
               subdomain: selectedSite.subdomain,
               seo: {
                  title: selectedSite.seo_title,
                  description: selectedSite.seo_description
               },
               theme: selectedSite.theme_config
            },
            sections: JSON.parse(jsonString)
         };

         root.file("webspec.json", JSON.stringify(webSpec, null, 2));


         // --- C. STATIC FILES (Vanilla JS Engine) ---

         // index.html
         const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${selectedSite.seo_title || selectedSite.name}</title>
    <meta name="description" content="${selectedSite.seo_description}">
    <link href="https://fonts.googleapis.com/css2?family=${(selectedSite.theme_config.font_family || 'Inter').replace(' ', '+')}:wght@400;700;900&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="assets/site.css">
</head>
<body class="bg-slate-50 text-slate-800">
    <div id="app"></div>
    <script src="assets/site.js"></script>
</body>
</html>`;
         root.file("index.html", htmlContent);

         // reservar.html
         const bookingHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservar - ${selectedSite.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 class="text-2xl font-black mb-4">Finalizar Reserva</h1>
        <form id="bookingForm" class="space-y-4">
            <div>
                <label class="block text-sm font-bold mb-1">Nombre</label>
                <input type="text" class="w-full border p-2 rounded" required>
            </div>
            <div>
                <label class="block text-sm font-bold mb-1">Email</label>
                <input type="email" class="w-full border p-2 rounded" required>
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700">Confirmar</button>
        </form>
        <a href="index.html" class="block text-center text-sm text-slate-400 mt-4">Volver</a>
    </div>
    <script src="assets/reservar.js"></script>
</body>
</html>`;
         root.file("reservar.html", bookingHtml);


         // assets/site.js (THE ENGINE)
         const jsContent = `
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('webspec.json');
        const data = await res.json();
        renderSite(data);
    } catch (e) {
        console.error("Error loading webspec", e);
        document.body.innerHTML = '<p class="p-10 text-center text-red-500">Error cargando el sitio.</p>';
    }
});

function renderSite(data) {
    const app = document.getElementById('app');
    const { sections, site_info } = data;
    
    // Set Document Title
    document.title = site_info.seo.title || site_info.name;

    sections.forEach(s => {
        const el = document.createElement('div');
        
        switch(s.type) {
            case 'hero':
                el.className = "relative h-[80vh] flex items-center justify-center text-center p-6 bg-cover bg-center bg-slate-900";
                if(s.content.bg_image) el.style.backgroundImage = \`url('\${s.content.bg_image}')\`;
                el.innerHTML = \`
                    <div class="absolute inset-0 bg-black/40"></div>
                    <div class="relative z-10 text-white max-w-4xl mx-auto">
                        <h1 class="text-4xl md:text-6xl font-black mb-6">\${s.content.title}</h1>
                        <p class="text-lg md:text-xl opacity-90 mb-8">\${s.content.subtitle}</p>
                        <a href="reservar.html" class="inline-block px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform">Reservar Ahora</a>
                    </div>
                \`;
                break;
            
            case 'properties':
                el.className = "p-10 md:p-20 bg-slate-50";
                const cards = s.content.cards || [{},{},{}];
                let cardsHtml = '';
                cards.forEach((card, i) => {
                    // Only render valid objects
                    const title = card.title || \`Propiedad \${i+1}\`;
                    const img = card.image || ''; 
                    cardsHtml += \`
                        <div class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow group">
                            <div class="h-48 bg-slate-200 bg-cover bg-center relative" style="background-image: url('\${img}')">
                                \${!img ? '<div class="absolute inset-0 flex items-center justify-center text-slate-300">Sin Imagen</div>' : ''}
                            </div>
                            <div class="p-6">
                                <h3 class="font-bold text-xl mb-2">\${title}</h3>
                                <p class="text-slate-600 text-sm">Descripción corta de la propiedad...</p>
                                <a href="reservar.html" class="mt-4 block text-center py-2 bg-slate-100 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 rounded">Ver Detalles</a>
                            </div>
                        </div>
                    \`;
                });

                el.innerHTML = \`
                    <div class="max-w-6xl mx-auto">
                         <h2 class="text-3xl font-black text-slate-800 mb-10 text-center">\${s.content.title}</h2>
                         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            \${cardsHtml}
                         </div>
                    </div>
                \`;
                break;

            case 'gallery':
                el.className = "p-10 md:p-20 bg-white";
                const images = s.content.images || [];
                let gridHtml = images.map(src => \`
                    <div class="aspect-square rounded-xl overflow-hidden bg-slate-100">
                        <img src="\${src}" class="w-full h-full object-cover hover:scale-110 transition-transform duration-500" loading="lazy">
                    </div>
                \`).join('');
                
                el.innerHTML = \`
                     <div class="max-w-6xl mx-auto">
                        <h2 class="text-3xl font-black text-slate-800 mb-10 text-center">\${s.content.title || 'Galería'}</h2>
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            \${gridHtml}
                        </div>
                     </div>
                \`;
                break;

            case 'contact':
                el.className = "p-20 bg-slate-900 text-white text-center relative overflow-hidden";
                if(s.content.cover_image) el.innerHTML += \`<img src="\${s.content.cover_image}" class="absolute inset-0 w-full h-full object-cover opacity-20">\`;
                el.innerHTML += \`
                    <div class="relative z-10 max-w-xl mx-auto">
                        <h2 class="text-3xl font-black mb-6">Contáctanos</h2>
                        <div class="text-xl opacity-80 space-y-2">
                             <p>\${s.content.email}</p>
                             <p>\${s.content.phone}</p>
                        </div>
                    </div>
                \`;
                break;
            
            default: // Text
                 el.className = "p-10 md:p-20 bg-white";
                 el.innerHTML = \`
                    <div class="max-w-4xl mx-auto prose prose-lg">
                        <h2 class="text-3xl font-black text-slate-800 mb-6">\${s.content.title}</h2>
                        <p class="text-slate-600 leading-relaxed whitespace-pre-line">\${s.content.body}</p>
                    </div>
                 \`;
        }
        app.appendChild(el);
    });
}
`;
         if (assetsFolder) assetsFolder.file("site.js", jsContent);

         // assets/site.css
         if (assetsFolder) assetsFolder.file("site.css", `
body { font-family: 'Inter', sans-serif; }
/* Custom generic styles if needed */
            `);

         // assets/reservar.js
         if (assetsFolder) assetsFolder.file("reservar.js", `
document.getElementById('bookingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('¡Reserva Simulada Recibida! En un entorno real, esto conectaría con tu API.');
});
            `);


         // --- GENERATE AND SAVE ---
         const content = await zip.generateAsync({ type: "blob" });
         const url = URL.createObjectURL(content);
         const a = document.createElement("a");
         a.href = url;
         a.download = `${slug}.zip`;
         a.click();
         URL.revokeObjectURL(url);

         // Update last_exported_at
         const updated = { ...selectedSite, last_exported_at: Date.now() };
         await projectManager.getStore().saveWebsite(updated);
         setSelectedSite(updated);
         setOriginalSite(updated);
         loadWebsites();

         // Close modal after success
         // setIsPublishModalOpen(false); // Keep open or close? User might want to read instructions.
         alert("ZIP generado. Sigue las instrucciones para subirlo.");

      } catch (err) {
         console.error(err);
         alert("Error generando ZIP.");
      }
   };

   const handleImportWebSpec = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedSite) return;

      try {
         const text = await file.text();
         const spec = JSON.parse(text);

         if (!spec.sections || !Array.isArray(spec.sections)) throw new Error("El archivo no parece un WebSpec válido (falta 'sections').");

         const updatedSite: WebSite = {
            ...selectedSite,
            name: spec.name || selectedSite.name,
            subdomain: spec.subdomain || selectedSite.subdomain,
            theme_config: spec.theme_config || selectedSite.theme_config,
            booking_config: spec.booking_config || selectedSite.booking_config,
            seo_title: spec.seo?.title || spec.seo_title || '',
            seo_description: spec.seo?.description || spec.seo_description || '',
            sections_json: JSON.stringify(spec.sections, null, 2),
            updated_at: Date.now()
         };

         setSelectedSite(updatedSite);
         alert("Importado correctamente. Revisa los cambios y pulsa Guardar.");
      } catch (err: any) {
         alert("Error importando JSON: " + err.message);
      }
      e.target.value = '';
   };

   const handleLoadFromPublic = async () => {
      if (!selectedSite) return;
      if (!confirm("Esto sobrescribirá la configuración actual con el archivo '/public/webspec.json'. ¿Continuar?")) return;

      try {
         const res = await fetch('/webspec.json');
         if (!res.ok) throw new Error(`HTTP ${res.status}`);
         const spec = await res.json();

         const updatedSite: WebSite = {
            ...selectedSite,
            name: spec.name || selectedSite.name,
            subdomain: spec.subdomain || selectedSite.subdomain,
            theme_config: spec.theme_config || selectedSite.theme_config,
            booking_config: spec.booking_config || selectedSite.booking_config,
            seo_title: spec.seo?.title || spec.seo_title || '',
            seo_description: spec.seo?.description || spec.seo_description || '',
            sections_json: JSON.stringify(spec.sections, null, 2),
            updated_at: Date.now()
         };

         setSelectedSite(updatedSite);
         alert("Cargado desde /public/webspec.json correctamente.");
      } catch (err: any) {
         alert("No se pudo cargar /webspec.json. Asegúrate de que el archivo existe en la carpeta pública.");
      }
   };

   // Simplified Render for Preview
   const renderSection = (s: any, idx: number) => {
      // Resolve images
      const bgImage = resolveMedia(s.content.bg_image);
      const isSectionDragOver = dragOverSection === `${idx}`;

      const wrapperClass = `relative transition-all duration-200 group/section ${isSectionDragOver ? 'ring-4 ring-indigo-500 ring-inset scale-[0.99] opacity-90' : ''}`;

      const content = (() => {
         switch (s.type) {
            case 'hero':
               return (
                  <div key={idx} className="relative h-64 bg-slate-900 flex items-center justify-center text-center p-6 bg-cover bg-center group/hero" style={{ backgroundImage: bgImage ? `url(${bgImage})` : undefined }}>
                     <div className="relative z-10 text-white">
                        <h1 className="text-2xl font-black mb-2">{s.content.title}</h1>
                        <p className="text-sm opacity-90">{s.content.subtitle}</p>
                        <button className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold shadow-lg">Reservar Ahora</button>
                     </div>
                     <div className={`absolute inset-0 ${bgImage ? 'bg-black/40' : ''}`}></div>

                     {/* Hero Change Button */}
                     <button
                        onClick={(e) => { e.stopPropagation(); setMediaSelectorTarget({ index: idx }); }}
                        className="absolute bottom-2 right-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover/hero:opacity-100 transition-opacity z-20"
                     >
                        <ImageIcon size={12} /> Fondo
                     </button>
                  </div>
               );
            case 'properties':
               // Ensure cards exist
               const cards = s.content.cards || [{}, {}, {}];
               return (
                  <div key={idx} className="p-6 bg-slate-50">
                     <h2 className="text-lg font-bold text-slate-800 mb-4">{s.content.title}</h2>
                     <div className="grid grid-cols-2 gap-4">
                        {cards.slice(0, 4).map((card: any, itemIdx: number) => {
                           const cardImg = resolveMedia(card.image);
                           const isItemDrag = dragOverSection === `${idx}-${itemIdx}`;
                           return (
                              <div
                                 key={itemIdx}
                                 className={`bg-white rounded-xl h-32 border relative overflow-hidden transition-all group/card ${isItemDrag ? 'ring-4 ring-indigo-500 border-indigo-500 z-10' : 'border-slate-100'}`}
                                 onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverSection(`${idx}-${itemIdx}`); }}
                                 onDragLeave={(e) => { e.stopPropagation(); setDragOverSection(`${idx}`); }} // Fallback to section
                                 onDrop={(e) => { e.stopPropagation(); handleSectionDrop(e, idx, itemIdx); }}
                              >
                                 {cardImg ? (
                                    <img src={cardImg} className="absolute inset-0 w-full h-full object-cover" />
                                 ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-300 bg-slate-50">
                                       <ImagePlus size={20} />
                                    </div>
                                 )}
                                 <div className="absolute bottom-0 inset-x-0 bg-white/90 p-2 text-[10px] font-bold">
                                    {card.title || `Propiedad ${itemIdx + 1}`}
                                 </div>

                                 {/* Card Change Button */}
                                 <button
                                    onClick={(e) => { e.stopPropagation(); setMediaSelectorTarget({ index: idx, itemIndex: itemIdx }); }}
                                    className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-indigo-50 hover:text-indigo-600"
                                    title="Cambiar imagen"
                                 >
                                    <Edit2 size={12} />
                                 </button>

                                 {isItemDrag && (
                                    <div className="absolute inset-0 z-50 bg-indigo-500/20 flex items-center justify-center pointer-events-none">
                                       <div className="bg-white text-indigo-600 px-2 py-1 rounded text-[8px] font-bold shadow-xl animate-bounce">
                                          Asignar aquí
                                       </div>
                                    </div>
                                 )}
                              </div>
                           )
                        })}
                     </div>
                  </div>
               );
            case 'contact':
               return (
                  <div key={idx} className="p-8 bg-slate-900 text-white text-center relative overflow-hidden group/contact">
                     {s.content.cover_image && <img src={resolveMedia(s.content.cover_image)} className="absolute inset-0 w-full h-full object-cover opacity-20" />}
                     <div className="relative z-10">
                        <p className="font-bold text-sm mb-2">Contáctanos</p>
                        <p className="text-xs opacity-70">{s.content.email} • {s.content.phone}</p>
                     </div>
                     <button
                        onClick={(e) => { e.stopPropagation(); setMediaSelectorTarget({ index: idx }); }}
                        className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white p-1.5 rounded-full opacity-0 group-hover/contact:opacity-100 transition-opacity"
                     >
                        <ImageIcon size={12} />
                     </button>
                  </div>
               );
            case 'gallery':
               return (
                  <div key={idx} className="p-6 bg-white">
                     <h2 className="text-lg font-bold text-slate-800 mb-4">{s.content.title || 'Galería'}</h2>
                     <div className="grid grid-cols-3 gap-2">
                        {(s.content.images || []).map((img: string, itemIdx: number) => {
                           const isItemDrag = dragOverSection === `${idx}-${itemIdx}`;
                           return (
                              <div
                                 key={itemIdx}
                                 className={`aspect-square relative rounded-lg overflow-hidden group/item ${isItemDrag ? 'ring-2 ring-indigo-500' : ''}`}
                                 onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverSection(`${idx}-${itemIdx}`); }}
                                 onDragLeave={(e) => { e.stopPropagation(); setDragOverSection(`${idx}`); }}
                                 onDrop={(e) => { e.stopPropagation(); handleSectionDrop(e, idx, itemIdx); }}
                              >
                                 <img src={resolveMedia(img)} className="w-full h-full object-cover" />

                                 <button
                                    onClick={(e) => { e.stopPropagation(); setMediaSelectorTarget({ index: idx, itemIndex: itemIdx }); }}
                                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity"
                                 >
                                    <Edit2 size={10} />
                                 </button>

                                 {isItemDrag && (
                                    <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center pointer-events-none">
                                       <RefreshCw className="text-white w-6 h-6 animate-spin" />
                                    </div>
                                 )}
                              </div>
                           )
                        })}
                        {/* Add Button */}
                        <div
                           className={`aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400 border-2 border-dashed border-slate-200 cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-500 transition-colors ${dragOverSection === `${idx}-new` ? 'bg-indigo-50 border-indigo-300 text-indigo-500' : ''}`}
                           onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverSection(`${idx}-new`); }}
                           onDragLeave={(e) => { e.stopPropagation(); setDragOverSection(`${idx}`); }}
                           onDrop={(e) => { e.stopPropagation(); handleSectionDrop(e, idx); }}
                           onClick={() => setMediaSelectorTarget({ index: idx })} // General add
                        >
                           <Plus size={20} />
                        </div>
                     </div>
                  </div>
               )

            default: // Text / Generic
               return (
                  <div key={idx} className="p-6 bg-white relative overflow-hidden">
                     {s.content.image && <img src={resolveMedia(s.content.image)} className="w-full h-32 object-cover rounded-xl mb-4" />}
                     <h3 className="font-bold text-slate-800 mb-2">{s.content.title}</h3>
                     <p className="text-sm text-slate-600 leading-relaxed">{s.content.body}</p>
                  </div>
               );
         }
      })();

      return (
         <div
            key={idx}
            className={wrapperClass}
            onDragOver={(e) => { e.preventDefault(); setDragOverSection(`${idx}`); }}
            onDragLeave={() => setDragOverSection(null)}
            onDrop={(e) => handleSectionDrop(e, idx)}
         >
            {content}
            {isSectionDragOver && (
               <div className="absolute inset-0 z-50 bg-indigo-500/20 flex items-center justify-center pointer-events-none">
                  <div className="bg-white text-indigo-600 px-4 py-2 rounded-full font-bold shadow-xl animate-bounce">
                     Soltar para asignar
                  </div>
               </div>
            )}

            {/* Hover Actions Overlay */}
            <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity z-40 group-hover:opacity-100">
               <button
                  onClick={(e) => { e.stopPropagation(); setMediaSelectorTarget({ index: idx }); }}
                  className="bg-white/90 hover:bg-white text-slate-700 p-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold flex items-center gap-2"
                  title="Cambiar Imagen"
               >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden md:inline">Cambiar Imagen</span>
               </button>
            </div>
         </div>
      );
   };

   // --- RENDER MODALS ---
   const renderMediaSelectorModal = () => {
      if (!mediaSelectorTarget) return null;

      // MODE A: Selecting an Image for a Section (clicked "Cambiar Imagen" on section)
      if (mediaSelectorTarget.index !== -1) {
         return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setMediaSelectorTarget(null)}>
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                        Seleccionar Imagen
                     </h3>
                     <button onClick={() => setMediaSelectorTarget(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="p-6 overflow-y-auto bg-slate-100 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     <label className="aspect-square bg-white border-2 border-dashed border-indigo-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition-colors">
                        <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                        <span className="text-xs font-bold text-indigo-600">Subir Nueva</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e)} />
                     </label>

                     {mediaAssets.map(asset => (
                        <div
                           key={asset.id}
                           onClick={() => handleMediaSelect(asset)}
                           className="group relative aspect-square bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                        >
                           <img src={asset.data_base64} className="w-full h-full object-cover" />
                           <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-[10px] text-white truncate">{asset.filename}</p>
                              <p className="text-[9px] text-white/70">{asset.width}x{asset.height}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         );
      }

      // MODE B: Assigning an Asset to a Section (clicked "Usar en..." on sidebar asset)
      if (mediaSelectorTarget.index === -1 && mediaSelectorTarget.assetId) {
         const sections = JSON.parse(selectedSite?.sections_json || '[]');
         return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setMediaSelectorTarget(null)}>
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <h3 className="font-bold text-lg text-slate-800">Usar imagen en...</h3>
                     <button onClick={() => setMediaSelectorTarget(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-2 max-h-[60vh] overflow-y-auto">
                     {sections.map((s: any, idx: number) => (
                        <button
                           key={idx}
                           onClick={() => {
                              // Fake the asset object since we have ID
                              const asset = mediaAssets.find(a => a.id === mediaSelectorTarget.assetId);
                              if (asset) {
                                 // Hijack handleMediaSelect but force the index
                                 // We need to temporarily set the target index effectively
                                 const newSections = JSON.parse(selectedSite!.sections_json);
                                 const targetSection = newSections[idx];
                                 const mediaLink = `media://${asset.id}`;

                                 // ... logic duplication ... 
                                 // Better to extract logic, but for now inline:
                                 if (targetSection.type === 'hero') { targetSection.content.bg_image = mediaLink; }
                                 else if (targetSection.type === 'gallery') {
                                    if (!targetSection.content.images) targetSection.content.images = [];
                                    targetSection.content.images.push(mediaLink);
                                 } else { targetSection.content.bg_image = mediaLink; targetSection.content.image = mediaLink; targetSection.content.cover_image = mediaLink; }

                                 const updatedJson = JSON.stringify(newSections, null, 2);
                                 updateSectionJson(updatedJson);
                                 setMediaSelectorTarget(null);
                              }
                           }}
                           className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg flex items-center justify-between group border-b border-slate-50 last:border-0"
                        >
                           <div>
                              <div className="font-bold text-sm text-slate-700 capitalize">{s.type} Section</div>
                              <div className="text-xs text-slate-400 truncate max-w-[200px]">{s.content.title || 'Sin título'}</div>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                        </button>
                     ))}
                  </div>
               </div>
            </div>
         )
      }

      return null;
   };

   if (selectedSite) {
      return (
         <div className="h-full flex flex-col animate-in fade-in bg-slate-100 rounded-3xl overflow-hidden">
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedSite(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ArrowLeft size={20} className="text-slate-500" /></button>
                  <input
                     className="font-black text-lg text-slate-800 bg-transparent outline-none focus:bg-slate-50 px-2 rounded-lg transition-colors"
                     value={selectedSite.name}
                     onChange={e => setSelectedSite({ ...selectedSite, name: e.target.value })}
                  />
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${selectedSite.status === 'published' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                     {selectedSite.status}
                  </span>
                  {hasChanges && (
                     <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-600 flex items-center gap-1 animate-pulse">
                        <AlertCircle size={10} /> Sin guardar
                     </span>
                  )}
                  {!hasChanges && lastSaved && (Date.now() - lastSaved < 3000) && (
                     <span className="px-2 py-1 rounded text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1 animate-in fade-in zoom-in border border-emerald-100">
                        <CheckCircle2 size={10} /> Guardado
                     </span>
                  )}
               </div>
               <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                     <button onClick={() => setDevice('desktop')} className={`p-2 rounded-lg transition-all ${device === 'desktop' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><Laptop size={16} /></button>
                     <button onClick={() => setDevice('mobile')} className={`p-2 rounded-lg transition-all ${device === 'mobile' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><Smartphone size={16} /></button>
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <button onClick={() => setIsPromptModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">
                     <Sparkles size={16} /> Prompt AI
                  </button>
                  <button onClick={() => navigate('/prompt-builder')} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors border border-slate-200">
                     Generador de prompts
                  </button>

                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                     <button onClick={handleExportWebSpec} className="p-2 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-500 transition-all font-bold text-xs flex items-center gap-1" title="Exportar WebSpec (JSON)">
                        <FileCode size={16} /> JSON
                     </button>
                     <button onClick={handleOpenPublishModal} className="p-2 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-500 transition-all font-bold text-xs flex items-center gap-1" title="Exportar ZIP para Publicar">
                        <Package size={16} /> ZIP
                     </button>
                  </div>

                  <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-xs shadow-lg relative overflow-hidden group">
                     <Save size={16} className={hasChanges ? "animate-bounce" : ""} />
                     {hasChanges ? "Guardar Ahora" : "Guardado"}
                  </button>
               </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
               {/* Left Panel: Config, JSON & Media */}
               <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
                  {/* Tab Bar */}
                  <div className="flex border-b border-slate-100">
                     <button onClick={() => setActiveTab('CONFIG')} className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${activeTab === 'CONFIG' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Configuración</button>
                     <button onClick={() => setActiveTab('MEDIA')} className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${activeTab === 'MEDIA' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Multimedia</button>
                  </div>

                  {activeTab === 'CONFIG' && (
                     <>
                        <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">

                           {/* Mode Toggle & Actions */}
                           <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                 <button
                                    onClick={() => setIsAdvancedMode(false)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${!isAdvancedMode ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                    <LayoutTemplate size={12} /> Visual
                                 </button>
                                 <button
                                    onClick={() => setIsAdvancedMode(true)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${isAdvancedMode ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                    <Code size={12} /> Avanzado (JSON)
                                 </button>
                              </div>

                              <div className="flex gap-1">
                                 <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportWebSpec} />
                                 <button onClick={() => zipInputRef.current?.click()} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Importar Web (ZIP)">
                                    <Import size={14} />
                                 </button>
                                 <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleImportZip} />
                                 <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportWebSpec} />
                                 <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Importar JSON WebSpec">
                                    <FileCode size={14} />
                                 </button>
                                 <button onClick={handleExportWebSpec} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Exportar JSON">
                                    <Download size={14} />
                                 </button>
                              </div>
                           </div>

                           {!isAdvancedMode ? (
                              <div className="space-y-6">
                                 {/* NAVIGATION CONTROLS */}
                                 <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl mb-4 border border-slate-200">
                                    <div className="flex items-center gap-2">
                                       <button
                                          onClick={() => setIsSingleViewMode(!isSingleViewMode)}
                                          className={`p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${!isSingleViewMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                          title={isSingleViewMode ? "Ver todo" : "Ver uno a uno"}
                                       >
                                          {isSingleViewMode ? <List size={14} /> : <Maximize2 size={14} />}
                                       </button>
                                       <div className="h-4 w-px bg-slate-300 mx-1"></div>
                                       {isSingleViewMode && (
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                             Sección {currentSectionIndex + 1} / {sections.length}
                                          </span>
                                       )}
                                    </div>

                                    {isSingleViewMode && (
                                       <div className="flex gap-1">
                                          <button
                                             onClick={() => setCurrentSectionIndex(prev => Math.max(0, prev - 1))}
                                             disabled={currentSectionIndex === 0}
                                             className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-all"
                                          >
                                             <ChevronLeft size={16} />
                                          </button>
                                          <button
                                             onClick={() => setCurrentSectionIndex(prev => Math.min(sections.length - 1, prev + 1))}
                                             disabled={currentSectionIndex === sections.length - 1}
                                             className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-all"
                                          >
                                             <ChevronRight size={16} />
                                          </button>
                                       </div>
                                    )}
                                 </div>

                                 {/* RENDER LIST OR SINGLE */}
                                 {sections.map((section: any, idx: number) => {
                                    if (isSingleViewMode && idx !== currentSectionIndex) return null;

                                    return (
                                       <div key={idx} className={`bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden group hover:border-indigo-200 transition-all ${isSingleViewMode ? 'shadow-lg ring-1 ring-indigo-50 border-indigo-100' : ''}`}>
                                          <div className="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center cursor-pointer" onClick={() => { if (!isSingleViewMode) { setIsSingleViewMode(true); setCurrentSectionIndex(idx); } }}>
                                             <div className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isSingleViewMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</div>
                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{section.type}</span>
                                             </div>
                                             {/* Mini Actions */}
                                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isSingleViewMode && <span className="text-[10px] text-indigo-500 font-bold">Editar &rarr;</span>}
                                             </div>
                                          </div>

                                          {/* Only expand content in Single Mode or always? Let's hide body in list mode to keep it clean, or show it? User requested "edit guided", so maybe list mode is just for reordering/overview? 
                                          Let's keep it expanded for now as per "Full View" description 
                                       */}
                                          <div className="p-4 space-y-4">
                                             {section.type === 'hero' && (
                                                <>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Título</label>
                                                      <input
                                                         className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                                         value={section.content.title || ''}
                                                         onChange={e => updateSectionContent(idx, 'title', e.target.value)}
                                                         placeholder="Título principal"
                                                      />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Subtítulo</label>
                                                      <input
                                                         className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:border-indigo-500 outline-none"
                                                         value={section.content.subtitle || ''}
                                                         onChange={e => updateSectionContent(idx, 'subtitle', e.target.value)}
                                                         placeholder="Descripción corta"
                                                      />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Imagen de Fondo (Arrastra aquí)</label>
                                                      <button
                                                         onClick={() => setMediaSelectorTarget({ index: idx })}
                                                         onDragOver={(e) => e.preventDefault()}
                                                         onDrop={(e) => {
                                                            e.preventDefault();
                                                            const data = e.dataTransfer.getData('text/plain');
                                                            if (data && data.startsWith('media://')) {
                                                               updateSectionContent(idx, 'bg_image', data);
                                                            }
                                                         }}
                                                         className="w-full h-20 bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 relative overflow-hidden group/btn"
                                                      >
                                                         {section.content.bg_image ? (
                                                            <>
                                                               <img src={resolveMedia(section.content.bg_image)} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/btn:opacity-30 transition-opacity" />
                                                               <span className="relative z-10 text-xs font-bold text-indigo-700 flex items-center gap-2"><ImageIcon size={14} /> Cambiar Imagen</span>
                                                            </>
                                                         ) : (
                                                            <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><ImagePlus size={14} /> Seleccionar Imagen</span>
                                                         )}
                                                      </button>
                                                   </div>
                                                </>
                                             )}

                                             {section.type === 'text' && (
                                                <>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Título</label>
                                                      <input
                                                         className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                                         value={section.content.title || ''}
                                                         onChange={e => updateSectionContent(idx, 'title', e.target.value)}
                                                         placeholder="Título de la sección"
                                                      />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Contenido</label>
                                                      <textarea
                                                         className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:border-indigo-500 outline-none resize-none h-24"
                                                         value={section.content.body || ''}
                                                         onChange={e => updateSectionContent(idx, 'body', e.target.value)}
                                                         placeholder="Escribe tu texto aquí..."
                                                      />
                                                   </div>
                                                </>
                                             )}

                                             {section.type === 'contact' && (
                                                <>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Email de contacto</label>
                                                      <input
                                                         className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                                         value={section.content.email || ''}
                                                         onChange={e => updateSectionContent(idx, 'email', e.target.value)}
                                                         placeholder="info@ejemplo.com"
                                                      />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Teléfono</label>
                                                      <input
                                                         className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                                         value={section.content.phone || ''}
                                                         onChange={e => updateSectionContent(idx, 'phone', e.target.value)}
                                                         placeholder="+34 600..."
                                                      />
                                                   </div>
                                                </>
                                             )}

                                             {/* GENERIC DROP AREA FOR OTHERS/TEXT/CONTACT IF THEY HAVE IMAGE */}
                                             {['text', 'contact'].includes(section.type) && (
                                                <div className="mt-2">
                                                   <label className="text-[10px] font-bold text-slate-400 block mb-1">Imagen / Portada (Arrastra aquí)</label>
                                                   <button
                                                      onClick={() => setMediaSelectorTarget({ index: idx })}
                                                      onDragOver={(e) => e.preventDefault()}
                                                      onDrop={(e) => {
                                                         e.preventDefault();
                                                         const data = e.dataTransfer.getData('text/plain');
                                                         if (data && data.startsWith('media://')) {
                                                            const field = section.type === 'contact' ? 'cover_image' : 'image';
                                                            updateSectionContent(idx, field, data);
                                                         }
                                                      }}
                                                      className="w-full h-16 bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 relative overflow-hidden group/btn"
                                                   >
                                                      {(section.content.image || section.content.cover_image) ? (
                                                         <>
                                                            <img src={resolveMedia(section.content.image || section.content.cover_image)} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/btn:opacity-30 transition-opacity" />
                                                            <span className="relative z-10 text-xs font-bold text-indigo-700 flex items-center gap-2"><ImageIcon size={14} /> Cambiar Imagen</span>
                                                         </>
                                                      ) : (
                                                         <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><ImagePlus size={14} /> Seleccionar Imagen</span>
                                                      )}
                                                   </button>
                                                </div>
                                             )}

                                             {/* Fallback for others */}
                                             {!['hero', 'text', 'contact'].includes(section.type) && (
                                                <div className="text-center py-4">
                                                   <p className="text-xs text-slate-400 mb-2">Este bloque ({section.type}) aún no tiene editor visual.</p>
                                                   <button onClick={() => setIsAdvancedMode(true)} className="text-[10px] font-bold text-indigo-600 hover:underline">
                                                      Editar en Modo Avanzado
                                                   </button>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    );
                                 })}

                                 {/* Add Section Button Placeholder */}
                                 <button onClick={() => setIsAdvancedMode(true)} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
                                    <Plus size={14} /> Añadir Sección (vía JSON por ahora)
                                 </button>
                              </div>
                           ) : (
                              /* JSON EDITOR (Advanced Mode) */
                              <div className="flex-1 flex flex-col h-full">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Code size={12} /> Editor JSON Puro</label>
                                    {jsonError && <span className="text-[10px] font-bold text-rose-500 animate-pulse">{jsonError}</span>}
                                 </div>
                                 <textarea
                                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-[10px] leading-relaxed text-slate-600 outline-none focus:border-indigo-300 resize-none custom-scrollbar"
                                    value={selectedSite.sections_json}
                                    onChange={e => updateSectionJson(e.target.value)}
                                    spellCheck={false}
                                 />
                                 <div className="mt-2 bg-amber-50 p-2 rounded text-[10px] text-amber-700 border border-amber-100">
                                    <strong>Precaución:</strong> Editar el JSON directamente puede romper la vista previa si la sintaxis es incorrecta.
                                 </div>
                              </div>
                           )}
                        </div>

                        {/* Basic Config Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                           <h4 className="text-xs font-bold text-slate-800 mb-4">Configuración General</h4>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-[10px] font-bold text-slate-400 block mb-1">Color Principal</label>
                                 <div className="flex items-center gap-2">
                                    <input type="color" className="w-8 h-8 rounded border-none cursor-pointer" value={selectedSite.theme_config.primary_color} onChange={e => setSelectedSite({ ...selectedSite, theme_config: { ...selectedSite.theme_config, primary_color: e.target.value } })} />
                                    <span className="text-xs font-mono text-slate-500">{selectedSite.theme_config.primary_color}</span>
                                 </div>
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold text-slate-400 block mb-1">Subdominio</label>
                                 <input className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold" value={selectedSite.subdomain} onChange={e => setSelectedSite({ ...selectedSite, subdomain: e.target.value })} />
                              </div>
                           </div>
                        </div>
                     </>
                  )}

                  {activeTab === 'MEDIA' && (
                     <div className="flex-1 flex flex-col p-4 bg-slate-50/50">
                        {/* Dropzone */}
                        <div className="mb-4">
                           <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-white hover:bg-slate-50 transition-colors group">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                 <ImagePlus className="w-6 h-6 mb-2 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                 <p className="text-[10px] text-slate-500 font-bold">Arrastra o Click para subir</p>
                              </div>
                              <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                           </label>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-3 gap-2 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                           {mediaAssets.map(asset => (
                              <div key={asset.id}
                                 className="aspect-square relative group rounded-lg overflow-hidden border border-slate-200 cursor-grab active:cursor-grabbing"
                                 draggable
                                 onDragStart={(e) => e.dataTransfer.setData('text/plain', `media://${asset.id}`)}
                              >
                                 <img src={resolveMedia(`media://${asset.id}`)} className="w-full h-full object-cover" loading="lazy" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <button onClick={() => {
                                       const link = `media://${asset.id}`;
                                       navigator.clipboard.writeText(link);
                                       setToast({ text: "Link copiado", type: 'success' });
                                    }} className="p-1.5 bg-white text-indigo-600 rounded-lg hover:scale-110 transition-transform" title="Copiar Enlace">
                                       <Link size={12} />
                                    </button>
                                    <button onClick={(e) => handleDeleteMedia(asset.id, e)} className="p-1.5 bg-white text-rose-600 rounded-lg hover:scale-110 transition-transform" title="Eliminar">
                                       <Trash2 size={12} />
                                    </button>
                                 </div>
                                 <div className="absolute top-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[7px] text-white font-mono">
                                    {asset.width || '?'}x{asset.height || '?'}
                                 </div>
                                 {/* Info */}
                                 <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                    <p className="text-[8px] text-white truncate text-center font-mono">{asset.filename}</p>
                                 </div>
                              </div>
                           ))}
                           {mediaAssets.length === 0 && (
                              <div className="col-span-3 py-10 text-center text-slate-400 text-xs text-slate-400">
                                 Sin imágenes. ¡Sube alguna!
                              </div>
                           )}
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mt-4">
                           <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                              <span className="font-bold">Tip:</span> Copia el link de una imagen y pégalo en el campo <code>bg_image</code> o <code>image</code> de tus secciones JSON para usarla.
                           </p>
                        </div>
                     </div>
                  )}
               </div>

               {/* Right Panel: Preview */}
               <div className="flex-1 bg-slate-100 flex items-center justify-center p-8 relative overflow-hidden">
                  <div className={`transition-all duration-500 bg-white shadow-2xl overflow-hidden flex flex-col relative ${device === 'mobile' ? 'w-[375px] h-[667px] rounded-[3rem] border-[8px] border-slate-800' : 'w-full h-full rounded-xl border border-slate-200'}`}>
                     {/* Fake Browser Bar for Desktop */}
                     {device === 'desktop' && (
                        <div className="bg-slate-50 border-b border-slate-100 p-2 flex items-center gap-2 px-4">
                           <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-400"></div><div className="w-3 h-3 rounded-full bg-amber-400"></div><div className="w-3 h-3 rounded-full bg-emerald-400"></div></div>
                           <div className="flex-1 bg-white border border-slate-200 rounded-md h-6 mx-4 flex items-center px-3 text-[10px] text-slate-400 font-medium">rentik.pro/{selectedSite.subdomain}</div>
                        </div>
                     )}

                     {/* Render Area */}
                     <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                        {previewUrl && selectedSite.status === 'imported' ? (
                           <iframe src={previewUrl} className="w-full h-full border-none" title="Preview" />
                        ) : (
                           sections.length > 0 ? sections.map((s: any, i: number) => renderSection(s, i)) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                 <LayoutTemplate size={48} className="mb-4" />
                                 <p className="text-sm font-medium">Estructura Vacía</p>
                              </div>
                           )
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {isPromptModalOpen && (
               <PromptBuilder
                  onClose={() => setIsPromptModalOpen(false)}
                  currentSite={selectedSite}
                  mode="MODAL"
                  onApply={async () => {
                     await loadWebsites();
                     // Also refresh selectedSite from list
                     const updated = (await projectManager.getStore().getWebsites()).find(s => s.id === selectedSite?.id);
                     if (updated) {
                        setSelectedSite(updated);
                        setOriginalSite(updated);
                     }
                  }}
               />
            )}

            {/* PUBLISH MODAL */}
            {isPublishModalOpen && selectedSite && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                     <div className="flex justify-between items-center p-6 border-b bg-slate-50">
                        <div>
                           <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                              <Rocket className="text-indigo-600" /> Publicar Sitio Web
                           </h3>
                           <p className="text-sm text-slate-500 font-medium">Descarga tu sitio y súbelo a Cloudflare Pages en segundos.</p>
                        </div>
                        <button onClick={() => setIsPublishModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                           <X size={24} className="text-slate-400" />
                        </button>
                     </div>

                     <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* LEFT: Config */}
                        <div className="space-y-6">
                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de carpeta (Slug)</label>
                              <div className="flex items-center gap-2">
                                 <span className="text-slate-400 text-xs">/</span>
                                 <input
                                    type="text"
                                    value={publishSlug}
                                    onChange={(e) => setPublishSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    className="flex-1 bg-slate-50 border p-2 rounded font-mono text-sm"
                                    placeholder="mi-apartamento"
                                 />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">Este será el nombre de la carpeta en el ZIP y la URL final.</p>
                           </div>

                           <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-amber-800 text-xs">
                              <strong>Modo Multi-Sitio:</strong><br />
                              Si subes varios ZIPs al mismo proyecto de Cloudflare, la estructura será:
                              <ul className="list-disc pl-4 mt-1 opacity-80">
                                 <li>rentikpro-sites.custom.com/<strong>apartamento-1</strong></li>
                                 <li>rentikpro-sites.custom.com/<strong>apartamento-2</strong></li>
                              </ul>
                           </div>

                           <button
                              onClick={handleConfirmedExportZip}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                           >
                              <Download size={18} /> Descargar ZIP
                           </button>
                        </div>

                        {/* RIGHT: Instructions */}
                        <div className="bg-slate-50 p-5 rounded-xl border space-y-4">
                           <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                              <Cloud className="text-sky-500" size={16} /> Instrucciones Cloudflare
                           </h4>
                           <ol className="text-xs text-slate-600 space-y-3 list-decimal pl-4">
                              <li>
                                 Entra en <a href="https://dash.cloudflare.com" target="_blank" className="text-indigo-600 underline">Cloudflare Dashboard</a> &rarr; <strong>Workers & Pages</strong>.
                              </li>
                              <li>
                                 Crea una aplicación <strong>Pages</strong> (si no tienes una para esto). Recomendado: <code>rentikpro-sites</code>.
                              </li>
                              <li>
                                 Descomprime el ZIP que acabas de descargar. Verás una carpeta llamada <strong>{publishSlug || 'slug'}</strong>.
                              </li>
                              <li>
                                 Sube esa carpeta a tu proyecto Pages (Drag & Drop en la pestaña "Deployments").
                              </li>
                              <li>
                                 ¡Listo! Tu web estará accesible en:<br />
                                 <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 mt-1 block w-fit">
                                    https://rentikpro-sites.pages.dev/{publishSlug || 'slug'}
                                 </code>
                              </li>
                           </ol>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {renderMediaSelectorModal()}

            {/* GLOBAL TOAST */}
            {toast && (
               <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in">
                  <div className={`px-6 py-3 rounded-full shadow-2xl font-bold text-sm flex items-center gap-3 ${toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-rose-500 text-white'}`}>
                     {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                     {toast.text}
                  </div>
               </div>
            )}
         </div>
      );
   }

   // LIST VIEW
   return (
      <div className="space-y-8 animate-in fade-in pb-20">
         <div className="flex justify-between items-center">
            <div>
               <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <Globe className="text-indigo-600" /> Mis Sitios Web
               </h2>
               <p className="text-slate-500">Crea y gestiona páginas de aterrizaje para tus propiedades.</p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => navigate('/prompt-builder')} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2">
                  <Sparkles size={16} /> Generador de Prompts
               </button>
               <button onClick={handleCreate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-105 transition-all flex items-center gap-2">
                  <Plus size={16} /> Crear Nueva Web
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map(ws => (
               <div key={ws.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-2 hover:shadow-xl hover:border-indigo-100 transition-all group cursor-pointer" onClick={() => setSelectedSite(ws)}>
                  <div className="bg-slate-100 rounded-[2rem] h-40 mb-4 flex items-center justify-center overflow-hidden relative">
                     {/* Mock Thumbnail */}
                     <LayoutTemplate size={48} className="text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                     <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-600 shadow-sm">
                        {ws.status}
                     </div>
                  </div>
                  <div className="px-6 pb-6">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{ws.name}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={(e) => { e.stopPropagation(); setSelectedSite(ws); }} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                              <Edit2 size={16} />
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">
                        <span className="flex items-center gap-1 border-l pl-3"><Calendar size={10} /> {new Date(ws.updated_at).toLocaleDateString()}</span>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/prompt-builder?siteId=${ws.id}`); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-[10px] hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                           <Sparkles size={14} /> Refinar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewSite(ws); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                           <Eye size={14} /> Ver
                        </button>
                     </div>
                  </div>
               </div>
            ))}

            <button onClick={handleCreate} className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-all group">
               <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={32} />
               </div>
               <span className="font-black text-xs uppercase tracking-widest">Añadir Nuevo</span>
            </button>
         </div>

         {/* Preview Modal for Gallery */}
         {previewSite && (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
               <div className="p-4 flex justify-between items-center border-b border-white/10">
                  <div className="flex items-center gap-4">
                     <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-400"></div><div className="w-3 h-3 rounded-full bg-amber-400"></div><div className="w-3 h-3 rounded-full bg-emerald-400"></div></div>
                     <h2 className="text-white font-black uppercase tracking-widest text-sm">{previewSite.name} - Preview</h2>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => setDevice(device === 'desktop' ? 'mobile' : 'desktop')} className="p-2 text-white/60 hover:text-white transition-colors bg-white/5 rounded-lg">
                        {device === 'desktop' ? <Smartphone size={20} /> : <Laptop size={20} />}
                     </button>
                     <button onClick={() => setPreviewSite(null)} className="p-2 text-white/60 hover:text-white transition-colors">
                        <X size={24} />
                     </button>
                  </div>
               </div>
               <div className="flex-1 overflow-hidden p-6 flex items-center justify-center">
                  <div className={`transition-all duration-500 bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative ${device === 'mobile' ? 'w-[375px] h-[667px] rounded-[3rem] border-[12px] border-slate-800' : 'w-full h-full rounded-2xl border border-white/10'}`}>
                     <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {JSON.parse(previewSite.sections_json || '[]').map((s: any, i: number) => renderSection(s, i))}
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
