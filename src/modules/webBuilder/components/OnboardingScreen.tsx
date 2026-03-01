import React, { useState, useEffect } from 'react';
import { Globe, Plus, ArrowRight, Monitor, Tablet, Smartphone, Star, BookOpen, Target, Zap, Shield, Clock, CheckCircle2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_SITE_CONFIG_V1 } from '../defaults';
import { generateV0Config } from '../v0Generator';
import { projectManager } from '@/services/projectManager';
import { Property } from '@/types';
import { SiteConfigV1 } from '../types';

interface DemoSite {
  id: string;
  name: string;
  description: string;
  template: SiteConfigV1;
  icon: React.ReactNode;
  features: string[];
}

export const OnboardingScreen: React.FC<{
  onContinue: (siteConfig?: SiteConfigV1) => void;
  isLoadingData: boolean;
  websites: any[];
  properties: Property[];
}> = ({ onContinue, isLoadingData, websites, properties }) => {
  const [showDemoSites, setShowDemoSites] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<DemoSite | null>(null);

  const DEMO_SITES: DemoSite[] = [
    {
      id: 'demo-hotel',
      name: 'Hotel Boutique',
      description: 'Elegante y profesional para hoteles y hostales',
      template: {
        ...DEFAULT_SITE_CONFIG_V1,
        pages: {
          '/': {
            ...DEFAULT_SITE_CONFIG_V1.pages['/'],
            blocks: [
              {
                id: 'hero',
                type: 'Hero',
                data: {
                  title: 'Bienvenido a nuestro Hotel',
                  subtitle: 'Experiencia única en el corazón de la ciudad',
                  ctaText: 'Ver habitaciones',
                  backgroundImage: '/static/demo/hotel-hero.jpg',
                },
                styles: {
                  desktop: {
                    minHeight: '500px',
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                },
              },
              {
                id: 'features',
                type: 'Features',
                data: {
                  title: 'Servicios Premium',
                  items: [
                    { icon: 'bed', title: 'Habitaciones', description: 'Confort y estilo' },
                    { icon: 'wifi', title: 'Internet', description: 'Wi-Fi gratuito' },
                    { icon: 'pool', title: 'Piscina', description: 'Zona de relax' },
                    { icon: 'coffee', title: 'Cafetería', description: 'Delicias gourmet' },
                  ],
                },
                styles: {
                  desktop: {
                    padding: '60px 0',
                    backgroundColor: '#f8f9fa',
                  }
                },
              },
              {
                id: 'gallery',
                type: 'Gallery',
                data: {
                  title: 'Nuestras Instalaciones',
                  images: [
                    '/static/demo/hotel-room1.jpg',
                    '/static/demo/hotel-pool.jpg',
                    '/static/demo/hotel-restaurant.jpg',
                    '/static/demo/hotel-room2.jpg',
                  ],
                },
                styles: {
                  desktop: {
                    padding: '60px 0',
                  }
                },
              },
              {
                id: 'cta',
                type: 'CTA',
                data: {
                  title: 'Reserva tu Estancia',
                  subtitle: 'Disponibilidad en tiempo real',
                  ctaText: 'Ver disponibilidad',
                  backgroundImage: '/static/demo/hotel-cta.jpg',
                },
                styles: {
                  desktop: {
                    minHeight: '400px',
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                },
              },
            ],
          },
        },
        themeId: 'hotel-luxury',
      },
      icon: <Globe className="text-amber-600" size={32} />,
      features: ['Hero con imagen', 'Galería de fotos', 'Servicios destacados', 'CTA con reservas'],
    },
    {
      id: 'demo-restaurant',
      name: 'Restaurante Gourmet',
      description: 'Moderno y apetitoso para restaurantes y cafeterías',
      template: {
        ...DEFAULT_SITE_CONFIG_V1,
        pages: {
          '/': {
            ...DEFAULT_SITE_CONFIG_V1.pages['/'],
            blocks: [
              {
                id: 'hero',
                type: 'Hero',
                data: {
                  title: 'Bienvenido a nuestro Restaurante',
                  subtitle: 'Experiencia culinaria única',
                  ctaText: 'Ver menú',
                  backgroundImage: '/static/demo/restaurant-hero.jpg',
                },
                styles: {
                  desktop: {
                    minHeight: '500px',
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                },
              },
              {
                id: 'gallery',
                type: 'Gallery',
                data: {
                  title: 'Nuestras Especialidades',
                  images: [
                    '/static/demo/restaurant-dish1.jpg',
                    '/static/demo/restaurant-dish2.jpg',
                    '/static/demo/restaurant-dish3.jpg',
                    '/static/demo/restaurant-dish4.jpg',
                  ],
                },
                styles: {
                  desktop: {
                    padding: '60px 0',
                  }
                },
              },
              {
                id: 'features',
                type: 'Features',
                data: {
                  title: '¿Por qué elegirnos?',
                  items: [
                    { icon: 'star', title: 'Calidad', description: 'Ingredientes frescos' },
                    { icon: 'chef', title: 'Chef', description: 'Experiencia culinaria' },
                    { icon: 'wine', title: 'Vinos', description: 'Selección premium' },
                    { icon: 'clock', title: 'Horario', description: 'Abierto todo el día' },
                  ],
                },
                styles: {
                  desktop: {
                    padding: '60px 0',
                    backgroundColor: '#f8f9fa',
                  }
                },
              },
              {
                id: 'cta',
                type: 'CTA',
                data: {
                  title: 'Reserva tu Mesa',
                  subtitle: 'Disponibilidad inmediata',
                  ctaText: 'Ver disponibilidad',
                  backgroundImage: '/static/demo/restaurant-cta.jpg',
                },
                styles: {
                  desktop: {
                    minHeight: '400px',
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                },
              },
            ],
          },
        },
        themeId: 'restaurant-modern',
      },
      icon: <Star className="text-red-500" size={32} />,
      features: ['Hero con imagen', 'Galería de platos', 'Características', 'CTA con reservas'],
    },
    {
      id: 'demo-tour',
      name: 'Agencia de Viajes',
      description: 'Dinámico y aventurero para agencias de viajes',
      template: {
        ...DEFAULT_SITE_CONFIG_V1,
        pages: {
          '/': {
            ...DEFAULT_SITE_CONFIG_V1.pages['/'],
            blocks: [
              {
                id: 'hero',
                type: 'Hero',
                data: {
                  title: 'Descubre el Mundo',
                  subtitle: 'Viajes inolvidables',
                  ctaText: 'Ver destinos',
                  backgroundImage: '/static/demo/tour-hero.jpg',
                },
                styles: {
                  desktop: {
                    minHeight: '500px',
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                },
              },
              {
                id: 'features',
                type: 'Features',
                data: {
                  title: 'Destinos Exclusivos',
                  items: [
                    { icon: 'compass', title: 'Asia', description: 'Cultura milenaria' },
                    { icon: 'beach', title: 'Caribe', description: 'Paraísos tropicales' },
                    { icon: 'europe', title: 'Europa', description: 'Historia y arte' },
                    { icon: 'america', title: 'América', description: 'Aventura garantizada' },
                  ],
                },
                styles: {
                  desktop: {
                    padding: '60px 0',
                    backgroundColor: '#f8f9fa',
                  }
                },
              },
              {
                id: 'gallery',
                type: 'Gallery',
                data: {
                  title: 'Experiencias Inolvidables',
                  images: [
                    '/static/demo/tour-beach.jpg',
                    '/static/demo/tour-mountain.jpg',
                    '/static/demo/tour-city.jpg',
                    '/static/demo/tour-safari.jpg',
                  ],
                },
                styles: {
                  desktop: {
                    padding: '60px 0',
                  }
                },
              },
              {
                id: 'cta',
                type: 'CTA',
                data: {
                  title: 'Planea tu Viaje',
                  subtitle: 'Ofertas exclusivas',
                  ctaText: 'Ver paquetes',
                  backgroundImage: '/static/demo/tour-cta.jpg',
                },
                styles: {
                  desktop: {
                    minHeight: '400px',
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                },
              },
            ],
          },
        },
        themeId: 'travel-adventure',
      },
      icon: <Target className="text-blue-500" size={32} />,
      features: ['Hero con imagen', 'Galería de destinos', 'Destinos destacados', 'CTA con paquetes'],
    },
  ];

  const handleCreateDemo = async (demo: DemoSite) => {
    setIsGeneratingDemo(true);
    setSelectedDemo(demo);

    try {
      const newSite: any = {
        id: `demo_${demo.id}_${Date.now()}`,
        name: demo.name,
        property_id: null,
        subdomain: demo.id,
        template_slug: 'demo',
        plan_type: 'pro',
        public_token: '',
        is_published: false,
        status: 'draft',
        theme_config: '{}',
        seo_title: demo.name,
        seo_description: demo.description,
        sections_json: JSON.stringify(demo.template),
        booking_config: '{}',
        property_ids_json: '[]',
        allowed_origins_json: '[]',
        features_json: '{}',
        slug: demo.id,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await projectManager.getStore().saveWebsite(newSite);
      toast.success(`Sitio ${demo.name} creado`);
      onContinue(demo.template);
    } catch (e: any) {
      console.error('[Onboarding] createDemo failed:', e);
      toast.error('Error al crear sitio demo');
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleImportTemplate = () => {
    toast.info('Función de importación de plantillas disponible próximamente');
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center text-slate-400">
        <Loader2 className="animate-spin mb-4" size={40} />
        <span className="font-black uppercase tracking-widest text-xs">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans overflow-y-auto border-t-4 border-indigo-600">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-end mb-12 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 mb-2">
              Web Builder <span className="text-indigo-600">Pro</span>
            </h1>
            <p className="text-slate-500 font-medium">Crea tu sitio web profesional en minutos</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setShowDemoSites(true)}
              className="bg-amber-100 text-amber-900 px-6 py-3 rounded-2xl font-black shadow-xl shadow-amber-100/50 flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              <Globe size={20} /> Ver demos
            </button>
          </div>
        </header>

        {/* Dashboard vacío */}
        {websites.length === 0 && !showDemoSites && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">🌐</div>
            <h2 className="text-2xl font-black text-slate-800 mb-4">¡Comienza tu sitio web!</h2>
            <p className="text-slate-500 text-lg mb-8">
              Elige una de las opciones para empezar a construir tu sitio web profesional
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <button
                onClick={() => onContinue(DEFAULT_SITE_CONFIG_V1)}
                className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Plus size={32} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Empezar desde cero</h3>
                <p className="text-slate-500 text-sm">Canvas completamente vacío para construir tu sitio único</p>
              </button>

              <button
                onClick={() => setShowDemoSites(true)}
                className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 hover:border-amber-200 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Globe size={32} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Usar sitio demo</h3>
                <p className="text-slate-500 text-sm">Elige una plantilla prediseñada y personalízala</p>
              </button>
            </div>

            <p className="text-sm text-slate-400">
              ¿No encuentras lo que buscas?{' '}
              <button
                onClick={handleImportTemplate}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Importar plantilla
              </button>
            </p>
          </div>
        )}

        {/* Lista de sitios existentes */}
        {websites.length > 0 && !showDemoSites && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {websites.map(ws => (
              <div
                key={ws.id}
                onClick={() => onContinue()}
                className="bg-white border border-slate-100 rounded-[2.5rem] p-5 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
              >
                <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2rem] mb-6 flex items-center justify-center relative overflow-hidden border border-slate-50 group-hover:border-indigo-100 transition-colors">
                  <div className="text-slate-100 font-black text-6xl opacity-50 select-none group-hover:text-indigo-50 transition-colors">RP</div>
                  {(ws.is_published || ws.status === 'published') && (
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                      Publicado
                    </div>
                  )}
                </div>
                <div className="px-2 pb-2 flex-1">
                  <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{ws.name ?? 'Sin Nombre'}</h3>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {ws.slug ?? ws.subdomain ?? 'sin slug'}
                  </div>
                </div>
                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 pb-2">
                  <div className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold text-center">
                    Abrir Editor
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Panel de demos */}
        {showDemoSites && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">Sitios Demo</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Elige una plantilla y personalízala</p>
              </div>
              <button
                onClick={() => setShowDemoSites(false)}
                className="p-4 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DEMO_SITES.map((demo) => (
                <div
                  key={demo.id}
                  className="group relative flex flex-col bg-slate-50 border border-slate-100 rounded-[2rem] p-6 hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
                  onClick={() => handleCreateDemo(demo)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {demo.icon}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">{demo.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-6 line-clamp-2">{demo.description}</p>

                  <div className="mt-auto flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {demo.features.slice(0, 3).map((feature, i) => (
                        <div key={i} className="w-4 h-4 rounded-full bg-indigo-100 border border-white" />
                      ))}
                    </div>
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      {isGeneratingDemo && demo.id === selectedDemo?.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Generando...
                        </>
                      ) : (
                        'Seleccionar'
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-slate-50 rounded-[1.5rem]">
              <h4 className="text-sm font-black text-slate-800 mb-3">¿Prefieres empezar desde cero?</h4>
              <button
                onClick={() => onContinue(DEFAULT_SITE_CONFIG_V1)}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-sm hover:shadow-indigo-100"
              >
                Canvas vacío
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};