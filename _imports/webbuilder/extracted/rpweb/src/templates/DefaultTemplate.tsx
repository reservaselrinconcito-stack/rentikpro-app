/**
 * templates/DefaultTemplate.tsx — Plantilla por defecto para cualquier tenant.
 *
 * Renderiza con los datos del BootstrapContext.
 * SIN llamadas directas a API. SIN null unchecked.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrapState } from '../app/BootstrapContext';

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const Header: React.FC = () => {
  const { property } = useBootstrapState();
  if (!property) return null;

  return (
    <header
      style={{
        background: '#fff',
        borderBottom: '1px solid #e7e5e4',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {property.logoUrl ? (
          <img src={property.logoUrl} alt={property.name} style={{ height: 40, objectFit: 'contain' }} />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.1rem',
            }}
          >
            {property.shortName.charAt(0)}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, color: '#1c1917', fontSize: '1rem' }}>
            {property.name}
          </div>
          {property.slogan && (
            <div style={{ fontSize: '0.75rem', color: '#78716c' }}>{property.slogan}</div>
          )}
        </div>
      </div>

      {property.phone && (
        <a
          href={`tel:${property.phoneRaw || property.phone}`}
          style={{
            padding: '0.5rem 1rem',
            background: '#ea580c',
            color: '#fff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          📞 {property.phone}
        </a>
      )}
    </header>
  );
};

const Hero: React.FC = () => {
  const { property } = useBootstrapState();
  if (!property) return null;

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
        color: '#fff',
        padding: '5rem 2rem',
        textAlign: 'center',
      }}
    >
      <p style={{ color: '#ea580c', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 2, marginBottom: '1rem' }}>
        {property.location.town}{property.location.province ? ` · ${property.location.province}` : ''}
      </p>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: '1.25rem', lineHeight: 1.1 }}>
        {property.name}
      </h1>
      {property.slogan && (
        <p style={{ fontSize: '1.15rem', color: '#d6d3d1', maxWidth: 600, margin: '0 auto 2rem' }}>
          {property.slogan}
        </p>
      )}
      <a
        href="#apartments"
        style={{
          display: 'inline-block',
          padding: '1rem 2.5rem',
          background: '#ea580c',
          color: '#fff',
          borderRadius: '0.75rem',
          fontWeight: 700,
          textDecoration: 'none',
          fontSize: '1rem',
        }}
      >
        Ver apartamentos ↓
      </a>
    </section>
  );
};

const ApartmentCard: React.FC<{ apt: any }> = ({ apt }) => {
  const { t, i18n } = useTranslation();
  const hasPrice = apt.publicBasePrice !== null && apt.publicBasePrice !== undefined;

  const formattedPrice = hasPrice
    ? new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: apt.currency || 'EUR'
    }).format(apt.publicBasePrice as number)
    : '';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #f5f5f4',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Foto o placeholder */}
      <div
        style={{
          height: 200,
          background: apt.photos?.[0]
            ? `url(${apt.photos[0]}) center/cover`
            : 'linear-gradient(135deg, #e7e5e4 0%, #d6d3d1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!apt.photos?.[0] && (
          <span style={{ fontSize: 48, opacity: 0.4 }}>🏡</span>
        )}
        {apt.status === 'coming_soon' && (
          <div
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: '#78716c',
              color: '#fff',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {t('nav.comingSoon')}
          </div>
        )}
      </div>

      <div style={{ padding: '1.25rem' }}>
        <h3 style={{ fontWeight: 700, color: '#1c1917', fontSize: '1.1rem', marginBottom: '0.35rem' }}>
          {apt.name}
        </h3>
        <p style={{ color: '#78716c', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          {apt.description || 'Apartamento rural con encanto.'}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {apt.capacity && (
            <span style={{ fontSize: '0.8rem', color: '#57534e' }}>👥 {apt.capacity} {t('featured.guests')}</span>
          )}
          {apt.bedrooms && (
            <span style={{ fontSize: '0.8rem', color: '#57534e' }}>🛏 {apt.bedrooms} {t('featured.rooms')}</span>
          )}
          {apt.sizeM2 && (
            <span style={{ fontSize: '0.8rem', color: '#57534e' }}>📐 {apt.sizeM2} m²</span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          {hasPrice ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: '#78716c', fontWeight: 600 }}>{t('price.from')}</span>
              <span style={{ fontWeight: 700, color: '#ea580c', fontSize: '1rem' }}>
                {formattedPrice}<span style={{ fontWeight: 400, color: '#78716c', fontSize: '0.8rem' }}>{t('price.perNight')}</span>
              </span>
              <span style={{ fontSize: '0.65rem', color: '#a8a29e' }}>{t('price.note')}</span>
            </div>
          ) : (
            <span style={{ color: '#78716c', fontSize: '0.85rem', fontWeight: 600 }}>{t('price.ask')}</span>
          )}
          <button
            style={{
              padding: '0.5rem 1rem',
              background: '#ea580c',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() => {
              const el = document.getElementById('contact');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t('cta.bookNow')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ApartmentsSection: React.FC = () => {
  const { apartments } = useBootstrapState();

  return (
    <section id="apartments" style={{ padding: '4rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem', textAlign: 'center' }}>
        Nuestros Apartamentos
      </h2>
      <p style={{ textAlign: 'center', color: '#78716c', marginBottom: '2.5rem' }}>
        {apartments.length} alojamiento{apartments.length !== 1 ? 's' : ''} disponibles
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {apartments.map((apt) => (
          <ApartmentCard key={apt.id} apt={apt} />
        ))}
      </div>
    </section>
  );
};

const AvailabilitySection: React.FC = () => {
  const { availability, apartments } = useBootstrapState();
  const [selectedApt, setSelectedApt] = useState<string>(apartments[0]?.slug ?? '');

  if (!availability || apartments.length === 0) return null;

  const aptAvail = availability.apartments.find((a) => a.apartmentSlug === selectedApt);
  const visibleDays = (aptAvail?.days ?? []).slice(0, 30);

  return (
    <section id="availability" style={{ background: '#f5f5f4', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem', textAlign: 'center' }}>
          Disponibilidad
        </h2>
        <p style={{ textAlign: 'center', color: '#78716c', marginBottom: '2rem' }}>
          Próximos 30 días
        </p>

        {/* Selector de apartamento */}
        {apartments.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {apartments.map((apt) => (
              <button
                key={apt.slug}
                onClick={() => setSelectedApt(apt.slug)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  border: '1.5px solid',
                  borderColor: selectedApt === apt.slug ? '#ea580c' : '#d6d3d1',
                  background: selectedApt === apt.slug ? '#ea580c' : '#fff',
                  color: selectedApt === apt.slug ? '#fff' : '#57534e',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {apt.name}
              </button>
            ))}
          </div>
        )}

        {/* Mini calendar grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.25rem',
          }}
        >
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#78716c', padding: '0.35rem 0' }}>
              {d}
            </div>
          ))}

          {visibleDays.map((day) => {
            const date = new Date(day.date + 'T00:00:00');
            return (
              <div
                key={day.date}
                title={day.date}
                style={{
                  textAlign: 'center',
                  padding: '0.5rem 0.25rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: day.isAvailable ? '#dcfce7' : '#fee2e2',
                  color: day.isAvailable ? '#166534' : '#991b1b',
                  cursor: 'default',
                }}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#78716c', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#dcfce7', display: 'inline-block' }} />
            Disponible
          </span>
          <span style={{ fontSize: '0.8rem', color: '#78716c', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fee2e2', display: 'inline-block' }} />
            Ocupado
          </span>
        </div>
      </div>
    </section>
  );
};

const ContactSection: React.FC = () => {
  const { property } = useBootstrapState();
  if (!property) return null;

  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Lead se enviará desde aquí via createLead (integrable)
    console.info('[Contact] Lead:', form, 'propertyId:', property.propertyId);
    setSent(true);
  };

  return (
    <section id="contact" style={{ padding: '4rem 2rem', maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem', textAlign: 'center' }}>
        Contacto
      </h2>
      <p style={{ textAlign: 'center', color: '#78716c', marginBottom: '2rem' }}>
        ¿Tienes preguntas? Escríbenos.
      </p>

      {sent ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f0fdf4', borderRadius: '1rem', color: '#166534' }}>
          <div style={{ fontSize: 36, marginBottom: '0.75rem' }}>✅</div>
          <p style={{ fontWeight: 600 }}>¡Mensaje enviado! Te responderemos pronto.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Tu nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={{ padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #d6d3d1', fontSize: '1rem', outline: 'none' }}
          />
          <input
            type="email"
            placeholder="Tu email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            style={{ padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #d6d3d1', fontSize: '1rem', outline: 'none' }}
          />
          <textarea
            placeholder="Tu mensaje"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
            rows={4}
            style={{ padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #d6d3d1', fontSize: '1rem', outline: 'none', resize: 'vertical' }}
          />
          <button
            type="submit"
            style={{
              padding: '1rem',
              background: '#ea580c',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Enviar mensaje →
          </button>
        </form>
      )}

      {/* Info de contacto directo */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {property.phone && (
          <a href={`tel:${property.phoneRaw || property.phone}`} style={{ color: '#57534e', textDecoration: 'none', fontSize: '0.9rem' }}>
            📞 {property.phone}
          </a>
        )}
        {property.email && (
          <a href={`mailto:${property.email}`} style={{ color: '#57534e', textDecoration: 'none', fontSize: '0.9rem' }}>
            ✉️ {property.email}
          </a>
        )}
      </div>
    </section>
  );
};

const Footer: React.FC = () => {
  const { property, source } = useBootstrapState();
  if (!property) return null;

  return (
    <footer style={{ background: '#1c1917', color: '#d6d3d1', padding: '2rem', textAlign: 'center', fontSize: '0.85rem' }}>
      <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{property.name}</p>
      <p style={{ color: '#78716c' }}>
        {property.location.town}{property.location.province ? `, ${property.location.province}` : ''}
      </p>
      <p style={{ marginTop: '1rem', color: '#57534e', fontSize: '0.75rem' }}>
        Powered by{' '}
        <a href="https://rentikpro.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ea580c', textDecoration: 'none' }}>
          RentikPro
        </a>
        {source !== 'api' && ' · Modo demo'}
      </p>
    </footer>
  );
};

// ─── Template principal ───────────────────────────────────────────────────────

export const DefaultTemplate: React.FC = () => (
  <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#fafaf9' }}>
    <Header />
    <main>
      <Hero />
      <ApartmentsSection />
      <AvailabilitySection />
      <ContactSection />
    </main>
    <Footer />
  </div>
);

export default DefaultTemplate;
