import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader, Moon, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Complete knowledge base for the chatbot
const KNOWLEDGE_BASE = `
Eres el asistente virtual de El Rinconcito Matarraña, apartamentos rurales de lujo en Fuentespalda, Teruel, España.
Eres experto en todo lo relacionado con el alojamiento, el territorio y la comarca. Hablas el idioma del usuario.
Responde siempre en el idioma en que te hablen (español, inglés, francés, alemán...).
Sé cálido, personal, conciso y útil. Nunca inventes precios o disponibilidad — para reservas envía al WhatsApp.

=== EL ALOJAMIENTO ===
Nombre: El Rinconcito Matarraña
Propietarios: Toni y Evelyn (responden personalmente)
Dirección: Calle San Lorenzo 4, Fuentespalda, Teruel 44587
Teléfono: +34 629 837 369 (WhatsApp disponible)
Email: reservas.elrinconcito@gmail.com
Puntuación: 10/10 en Booking.com · 5/5 en Google Reviews

=== LOS APARTAMENTOS ===
1. Los Almendros: Amplio, hasta 6 personas, 2 habitaciones, 2 baños, cocina equipada, terraza con vistas, parking. Desde 90€/noche. 
2. La Ermita: Íntimo y romántico, 2 personas, 1 habitación, decoración rústica-moderna, jacuzzi privado. Desde 95€/noche.
3. La Tirolina: Aventurero y espacioso, hasta 8 personas, 3 habitaciones, ideal grupos/familias, terraza, BBQ. Desde 130€/noche.
Los precios varían según temporada. Gestión integrada con RentikPro.

=== ECLIPSE 2026 — LA NOTICIA DEL SIGLO ===
El 12 de agosto de 2026 habrá el primer eclipse solar TOTAL visible desde España en más de 100 años.
Fuentespalda y el Matarraña están en la FRANJA DE TOTALIDAD.
Datos exactos: totalidad a las 20:29h, duración ~1 minuto 27 segundos (Torre del Compte, 10km).
ADEMÁS: esa misma noche (12-13 agosto) es el PICO DE LAS PERSEIDAS (lluvia de estrellas).
Los apartamentos de agosto 2026 se están agotando. Hay paquetes especiales Eclipse.
Enviamos gafas certificadas ISO con la reserva para el eclipse.

=== GASTRONOMÍA — DATO EXCLUSIVO ===
LA TORRE DEL VISCO (Fuentespalda, 400 metros del Rinconcito):
- Estrella Michelin ★ + Estrella Verde Michelin (sostenibilidad)
- Chef: Rubén Catalán, cocina verde con huerta propia
- Menú trufa negra del Matarraña: 110€ (5 platos)
- A PIE desde el apartamento — literalmente la misma calle

Otros restaurantes cercanos:
- La Fábrica de Solfa (Beceite, 12km): ☀ Sol Repsol 2026, junto al río Matarraña
- Baudilio (Valderrobres, 18km): ☀ Sol Repsol 2026, cocina de caza y huerta
- Restaurante Matarraña (La Fresneda, 10km): institución de la comarca
- Fonda Alcalá (Calaceite, 22km): cocina artesana desde 1940

Productos locales estrella:
- Aceite D.O. Empeltre: variedal única de olivar centenario
- Trufa negra (Tuber melanosporum): temporada dic–mar
- Judías de Beceite: la legumbre más famosa de la comarca
- Vino D.O. Matarraña: Garnacha y Cariñena de viñas viejas
- Ternasco de Aragón IGP

=== VÍA VERDE VAL DE ZAFÁN ===
Una de las vías verdes más largas de España (135 km).
Antiguo ferrocarril reconvertido en ruta ciclista, accesible para todos.
Pasa por: Valjunquera, Valdeltormo, Torre del Compte, Valderrobres, Cretas, Lledó.
Tramo recomendado para empezar: Cretas → Torre del Compte (8,8 km, muy fácil, 1h).
Tramo espectacular: Horta de Sant Joan → Torre del Compte (22 km, viaducto sobre río Algars).
Alquiler bici: Matarraña Aventura (Cretas) — incluye transfer de recogida.
Desde El Rinconcito: 15 min en coche a cualquier punto de entrada.
Ruta épica completa: del Matarraña hasta el Delta del Ebro (Tortosa).

=== ASTROTURISMO Y CIELOS ===
El Matarraña tiene cero contaminación lumínica. Cielos entre los más oscuros de España.
A simple vista se ve: Vía Láctea completa, Andrómeda, las Pléyades, Orión (invierno), Escorpio (verano).
Mejor época: verano (Vía Láctea en el cenit), invierno (constelaciones de invierno muy nítidas).
Luna nueva: las mejores noches.
Lluvias de estrellas desde Fuentespalda:
- Perseidas: 11-13 agosto (PICO el 12-13 agosto — la misma noche del eclipse 2026!)
- Gemínidas: 13-14 diciembre (mejor lluvia del año)
- Cuadrántidas: 3-4 enero
Torre dels Moros (Peñarroya de Tastavins, 8km): punto de observación histórico + torre medieval.
Para observar: salir a 500m del pueblo, tumbarse en el campo, esperar 20 min de adaptación ocular.

=== CALIDAD DEL AGUA — ZONAS DE BAÑO ===
El agua del Matarraña es de las más limpias de España. Fuente: MITECO (calidad excelente).
Parrizal de Beceite (22km): El paraje más icónico. Hoces del río Matarraña. Pasarelas sobre agua color esmeralda entre paredes de roca caliza. No hace falta entrar al agua — las vistas son suficientes.
Baños naturales del río Matarraña: pozas de agua cristalina, temperatura agradable en verano.
Arens de Lledó (11km): acceso al río con pozas naturales.
Viaducto de la Vía Verde sobre el río Algars: baño natural en la base del viaducto.
CONSEJO DE TONI: "El mejor baño es el de primera hora de la mañana, antes de las 10h. Menos gente y el agua está en su mejor temperatura."

=== CALIDAD DEL AIRE ===
Fuentespalda está en una Reserva de la Biosfera (UNESCO).
Índice de calidad del aire: excelente (categoría 1, la mejor posible).
Sin industria en un radio de 50 km. Vientos limpios del Mediterráneo.
Los bosques de pino y encina de los Puertos de Beceite filtran el aire naturalmente.
Altitud de Fuentespalda: ~740 metros sobre el nivel del mar.
Ideal para: asmáticos, alergias respiratorias, recuperación post-Covid.

=== RUTAS NOCTURNAS ===
1. Ruta de las Estrellas (propia): desde el apartamento, 2 km a pie hasta el mirador de la ermita. Sin luz artificial. Vía Láctea desde las 22h en verano.
2. Torre dels Moros (Peñarroya, 8km): mirador astronómico histórico. Atardecer + noche de estrellas.
3. Valderrobres by night: el castillo iluminado + paseo por el casco histórico de noche.
4. Parrizal nocturno (solo luna llena): el río Matarraña bajo la luna. Sonido del agua. Luciérnagas en junio.

=== LUGARES — PUEBLOS MÁS BONITOS ===
Valderrobres (18km): "Pueblo más bonito de España" (varios rankings). Castillo gótico, puente medieval, plaza mayor. Visita obligatoria.
Beceite (12km): Nacimiento del río Matarraña. Casco histórico y acceso al Parrizal.
La Fresneda (10km): Conjunto histórico-artístico. Bodegas del siglo XVI, aceite D.O., plaza porticada.
Calaceite (22km): Patrimonio ibérico (poblados prerromanos). Casa-palacio, oleoturismo.
Arens de Lledó (11km): Ermita románica, sierra y rutas de montaña.
Peñarroya de Tastavins (8km): Torre dels Moros (punto astronómico), pueblo casi despoblado.

=== ACTIVIDADES ===
- Matarraña Bike Park & Dirt Park (Fuentespalda, 1km): NUEVO 2026. 5 líneas de descenso, dirt park. Gratuito.
- Tirolina doble (Fuentespalda): Adrenalina con vistas panorámicas.
- Senderismo: PR-TE 46, senderos del Parrizal, Puertos de Beceite.
- Kayak/Canoa: Río Matarraña en verano.
- Espeleología: cuevas de la sierra.
- Oleoturismo: visita a cooperativa y cata de aceite D.O. Empeltre.
- Enoturismo: bodegas de La Fresneda, vino D.O. Matarraña.
- Astrofotografía: talleres disponibles bajo petición.

=== RENTIKPRO — GESTIÓN ===
Los apartamentos están gestionados por RentikPro (rentikpro.com).
Calendario sincronizado en tiempo real con Booking.com, Airbnb y reserva directa.
0 overbookings garantizados por la tecnología RentikPro.
Check-in digital: recibes los códigos de acceso por WhatsApp antes de llegar.
Caja fuerte con llave: sin contacto humano si se prefiere.
Para reservar: WhatsApp +34 629 837 369 o Booking.com.

=== PREGUNTAS FRECUENTES ===
Q: ¿Hay parking? R: Sí, todos los apartamentos tienen parking gratuito.
Q: ¿Se admiten mascotas? R: Consultar con Toni/Evelyn según el apartamento.
Q: ¿Cuándo es mejor visitar? R: Primavera (flores, senderismo), verano (baños, eclipse 2026), otoño (trufa, setas, colores), invierno (paz, trufa, estrellas sin hojas).
Q: ¿A qué distancia está del mar? R: 1h 30min hasta Peñíscola, 2h hasta Barcelona.
Q: ¿Cómo se llega? R: Mejor en coche. Desde Zaragoza: 1h 45min. Desde Valencia: 2h 30min. Desde Barcelona: 3h.
Q: ¿Hay WiFi? R: Sí, WiFi gratuito en todos los apartamentos.
Q: ¿Temperatura en verano? R: Calor seco, entre 28-35°C de día. Noches frescas (18-22°C) gracias a la altitud.
`;

const SUGGESTED_QUESTIONS = [
  { es: '¿El eclipse de 2026 se ve desde aquí?', en: 'Can you see the 2026 eclipse from here?', icon: '🌑' },
  { es: '¿Dónde comer con estrella Michelin?', en: 'Where to eat with a Michelin star?', icon: '⭐' },
  { es: '¿Cómo hacer la Vía Verde?', en: 'How to do the Vía Verde?', icon: '🚲' },
  { es: 'Quiero ver las estrellas esta noche', en: 'I want to see stars tonight', icon: '🌟' },
  { es: '¿Cuáles son las mejores pozas de baño?', en: 'What are the best swimming spots?', icon: '💧' },
  { es: '¿Cómo reservo un apartamento?', en: 'How do I book an apartment?', icon: '🏠' },
];

export const SmartChatbot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: lang === 'en'
        ? 'Hello! I\'m the El Rinconcito Matarraña assistant. I can tell you everything about the apartments, the 2026 eclipse, the Michelin star restaurant 400m away, the best swimming spots, the Vía Verde, stargazing... What would you like to know?'
        : 'Hola! Soy el asistente de El Rinconcito Matarraña. Puedo contarte todo sobre los apartamentos, el eclipse de 2026, el restaurante con estrella Michelin que está a 400m, las mejores pozas de baño, la Vía Verde, astroturismo... ¿Qué quieres saber?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setShowSuggestions(false);

    const userMessage: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: KNOWLEDGE_BASE,
          messages: [...history, { role: 'user', content: text }],
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || (lang === 'en' ? 'Sorry, I couldn\'t connect. Please contact us on WhatsApp.' : 'Lo siento, no pude conectarme. Contáctanos por WhatsApp.');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: lang === 'en'
          ? 'Sorry, I couldn\'t connect right now. For immediate help, WhatsApp us at +34 629 837 369!'
          : 'Lo siento, no pude conectarme ahora. Para ayuda inmediata, escríbenos al WhatsApp +34 629 837 369!',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, lang]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const chatHeight = expanded ? 'min(85vh, 680px)' : 'min(70vh, 520px)';

  return (
    <div
      className="fixed bottom-24 right-5 md:right-8 z-[900] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
      style={{
        width: expanded ? 'min(520px, calc(100vw - 32px))' : 'min(400px, calc(100vw - 32px))',
        height: chatHeight,
        background: 'var(--cream)',
        border: '1px solid rgba(28,24,18,0.1)',
        transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 24px 80px rgba(28,24,18,0.18)',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ background: 'var(--ink)', flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,169,110,0.15)' }}>
            <Moon size={18} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p className="font-sans font-semibold text-sm" style={{ color: 'var(--cream)' }}>{t('common.ai_assistant', 'Asistente IA')}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="font-sans text-[10px]" style={{ color: 'rgba(244,240,232,0.5)' }}>{t('common.ai_available')}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'rgba(244,240,232,0.5)' }}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'rgba(244,240,232,0.5)' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5" style={{ background: 'var(--ink)' }}>
                <Moon size={13} style={{ color: 'var(--gold)' }} />
              </div>
            )}
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background: msg.role === 'user' ? 'var(--ink)' : 'var(--cream-dark)',
                color: msg.role === 'user' ? 'var(--cream)' : 'var(--ink)',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 300,
                animation: 'fadeIn 0.3s ease',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5" style={{ background: 'var(--ink)' }}>
              <Moon size={13} style={{ color: 'var(--gold)' }} />
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--cream-dark)', borderRadius: '4px 18px 18px 18px' }}>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(d => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ink-muted)', animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggested questions */}
        {showSuggestions && messages.length === 1 && (
          <div className="pt-2">
            <p className="font-sans text-[9px] uppercase tracking-[0.2em] mb-3 px-1" style={{ color: 'var(--ink-muted)' }}>{t('common.frequency_asks')}</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(lang === 'en' ? q.en : q.es)}
                  className="text-left rounded-xl px-3 py-2 text-sm transition-all duration-200 hover:scale-[1.01] flex items-center gap-2"
                  style={{ background: 'var(--cream-dark)', color: 'var(--ink)', fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}
                >
                  <span>{q.icon}</span>
                  <span>{lang === 'en' ? q.en : q.es}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(28,24,18,0.08)', flexShrink: 0 }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={lang === 'en' ? 'Ask me anything...' : 'Pregúntame lo que quieras...'}
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none no-scrollbar"
            style={{
              background: 'var(--cream-dark)',
              color: 'var(--ink)',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 300,
              maxHeight: 100,
              border: '1.5px solid transparent',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(155,79,46,0.3)'; }}
            onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'transparent'; }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
            style={{
              background: input.trim() && !loading ? 'var(--ink)' : 'var(--cream-dark)',
              color: input.trim() && !loading ? 'var(--cream)' : 'var(--ink-muted)',
              transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.95)',
            }}
          >
            {loading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <p className="font-sans text-[9px] text-center mt-2" style={{ color: 'rgba(28,24,18,0.3)' }}>
          IA entrenada con todo el contenido del Matarraña · No sustituye a Toni y Evelyn 🙂
        </p>
      </div>
    </div>
  );
};

export const ChatToggle: React.FC<{ isOpen: boolean; onClick: () => void }> = ({ isOpen, onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-5 md:right-8 z-[901] w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-500"
    style={{
      background: isOpen ? 'var(--cream)' : 'var(--ink)',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      boxShadow: '0 8px 32px rgba(28,24,18,0.25)',
    }}
    aria-label="Abrir asistente"
  >
    {isOpen
      ? <ChevronDown size={22} style={{ color: 'var(--ink)' }} />
      : <Moon size={22} style={{ color: 'var(--gold)' }} />
    }
    {!isOpen && (
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 animate-pulse" style={{ fontSize: 8 }} />
    )}
  </button>
);
