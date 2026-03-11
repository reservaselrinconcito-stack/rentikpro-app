/**
 * src/pages/builder/webpro/export.ts
 *
 * Exportador HTML estático WebPro.
 * Genera un archivo HTML completo y autónomo desde un SiteConfigV1.
 * El HTML resultante no tiene dependencias externas (CSS inline, no frameworks).
 *
 * API pública:
 *  exportHtml(config) → string (HTML completo)
 *  downloadHtml(config, filename?) → void (descarga en el browser)
 */

import { SiteConfigV1, BlockInstance } from './types';

// ─── Main export functions ─────────────────────────────────────────────────────

export function exportHtml(config: SiteConfigV1): string {
    const page = config.pages['/'];
    if (!page) return '<html><body><p>No page configured</p></body></html>';

    const theme = config.theme;
    const primary = theme.colors.primary;
    const bg = theme.colors.background;
    const text = theme.colors.text;
    const textMuted = theme.colors.textMuted;
    const surface = theme.colors.surface;
    const border = theme.colors.border;
    const accent = theme.colors.accent;
    const radius = theme.radius.global;
    const headingFont = theme.typography.headingFont;
    const bodyFont = theme.typography.bodyFont;

    const fontsLink = headingFont === 'Georgia'
        ? '' // System font, no import needed
        : `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;

    const blocksHtml = page.blocks
        .filter(b => !b.hidden)
        .map(b => renderBlock(b, config))
        .join('\n');

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title || config.globalData.brandName}</title>
    <meta name="description" content="${page.description || ''}">
    ${fontsLink}
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --primary: ${primary};
            --bg: ${bg};
            --text: ${text};
            --text-muted: ${textMuted};
            --surface: ${surface};
            --border: ${border};
            --accent: ${accent};
            --radius: ${radius};
        }

        html { scroll-behavior: smooth; }

        body {
            font-family: '${bodyFont}', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            font-size: 16px;
            -webkit-font-smoothing: antialiased;
        }

        h1, h2, h3, h4, h5 {
            font-family: '${headingFont}', serif;
            font-weight: 900;
            line-height: 1.1;
        }

        a { text-decoration: none; }

        img { max-width: 100%; display: block; }

        section { width: 100%; }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .fp-btn {
            display: inline-block;
            background: var(--primary);
            color: #fff;
            padding: 1rem 2.5rem;
            border-radius: 100px;
            font-weight: 800;
            font-size: 1rem;
            letter-spacing: 0.02em;
            cursor: pointer;
            border: none;
            transition: opacity 0.2s;
        }
        .fp-btn:hover { opacity: 0.88; }
        .fp-btn-outline {
            background: transparent;
            color: var(--text);
            border: 2px solid var(--border);
        }
        .fp-btn-outline:hover { border-color: var(--primary); color: var(--primary); }

        /* Responsive grid */
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
        .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; }

        /* Animations */
        @keyframes fadeInUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeInUp 0.6s ease both; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        /* Section spacing */
        .fp-section { padding: 5rem 0; }

        /* Navigation */
        .fp-nav {
            position: sticky; top: 0; z-index: 100;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            padding: 0 2rem; height: 64px;
            display: flex; align-items: center; justify-content: space-between;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .fp-nav-brand { font-weight: 900; font-size: 1.25rem; color: var(--primary); }
        .fp-nav-links { display: flex; gap: 2rem; }
        .fp-nav-links a { color: var(--text-muted); font-weight: 600; font-size: 0.9rem; transition: color 0.2s; }
        .fp-nav-links a:hover { color: var(--primary); }

        /* Hero */
        .fp-hero {
            min-height: 80vh;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            text-align: center; padding: 4rem 2rem;
            position: relative; overflow: hidden;
        }
        .fp-hero-bg {
            position: absolute; inset: 0;
            background-size: cover; background-position: center;
        }
        .fp-hero-overlay {
            position: absolute; inset: 0;
            background: rgba(0,0,0,0.5);
        }
        .fp-hero-content { position: relative; z-index: 1; max-width: 900px; }
        .fp-hero-kicker {
            display: inline-block;
            background: rgba(255,255,255,0.15);
            color: rgba(255,255,255,0.9);
            padding: 0.5rem 1.5rem; border-radius: 100px;
            font-size: 0.75rem; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.15em;
            margin-bottom: 2rem;
            backdrop-filter: blur(8px);
        }
        .fp-hero h1 { font-size: clamp(2.5rem, 6vw, 5rem); color: #fff; margin-bottom: 1.5rem; }
        .fp-hero p { font-size: 1.2rem; color: rgba(255,255,255,0.85); max-width: 650px; margin: 0 auto 2.5rem; }
        .fp-hero-ctas { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .fp-hero-cta-secondary {
            display: inline-block;
            background: rgba(255,255,255,0.15);
            color: #fff; border: 1.5px solid rgba(255,255,255,0.4);
            padding: 1rem 2.5rem; border-radius: 100px;
            font-weight: 700; font-size: 1rem;
            backdrop-filter: blur(8px);
        }

        /* Stats */
        .fp-stats { background: var(--primary); padding: 4rem 2rem; }
        .fp-stats .grid-4 { max-width: 1100px; margin: 0 auto; }
        .fp-stat { text-align: center; color: #fff; }
        .fp-stat-value { font-size: 3rem; font-weight: 900; line-height: 1; margin-bottom: 0.5rem; }
        .fp-stat-label { font-size: 0.85rem; opacity: 0.8; font-weight: 600; }

        /* Features */
        .fp-features { background: var(--bg); }
        .fp-features-header { text-align: center; max-width: 600px; margin: 0 auto 3rem; }
        .fp-features-header h2 { font-size: clamp(2rem, 3vw, 2.8rem); margin-bottom: 1rem; }
        .fp-feature-card {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: var(--radius); padding: 2rem;
        }
        .fp-feature-icon { font-size: 2rem; margin-bottom: 1rem; }
        .fp-feature-title { font-size: 1.1rem; font-weight: 800; margin-bottom: 0.5rem; }
        .fp-feature-desc { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }

        /* Testimonials */
        .fp-testimonials { background: var(--surface); }
        .fp-testimonial-card {
            background: var(--bg); border: 1px solid var(--border);
            border-radius: var(--radius); padding: 2rem;
        }
        .fp-testimonial-stars { color: #f59e0b; font-size: 1.1rem; margin-bottom: 1rem; }
        .fp-testimonial-text { font-style: italic; color: var(--text); line-height: 1.7; margin-bottom: 1.25rem; }
        .fp-testimonial-name { font-weight: 800; font-size: 0.9rem; }
        .fp-testimonial-role { font-size: 0.8rem; color: var(--text-muted); }

        /* Gallery */
        .fp-gallery { background: var(--bg); }
        .fp-gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 3rem; }
        .fp-gallery-item { aspect-ratio: 4/3; overflow: hidden; border-radius: var(--radius); }
        .fp-gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .fp-gallery-item:hover img { transform: scale(1.05); }

        /* Pricing */
        .fp-pricing { background: var(--bg); }
        .fp-pricing-header { text-align: center; max-width: 600px; margin: 0 auto 3rem; }
        .fp-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; max-width: 1100px; margin: 0 auto; }
        .fp-plan {
            background: var(--surface); border: 1.5px solid var(--border);
            border-radius: var(--radius); padding: 2.5rem;
        }
        .fp-plan.featured {
            border-color: var(--primary); box-shadow: 0 0 0 4px ${primary}22;
        }
        .fp-plan-name { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); margin-bottom: 1rem; }
        .fp-plan-price { font-size: 3.5rem; font-weight: 900; color: var(--text); line-height: 1; }
        .fp-plan-period { font-size: 1rem; color: var(--text-muted); margin-bottom: 1.5rem; }
        .fp-plan-features { list-style: none; margin: 1.5rem 0; space-y: 0.75rem; }
        .fp-plan-feature { padding: 0.4rem 0; font-size: 0.9rem; color: var(--text); display: flex; gap: 0.5rem; }
        .fp-plan-feature::before { content: '✓'; color: var(--primary); font-weight: 900; flex-shrink: 0; }

        /* FAQ */
        .fp-faq { background: var(--surface); }
        .fp-faq-list { max-width: 800px; margin: 3rem auto 0; display: flex; flex-direction: column; gap: 1rem; }
        .fp-faq-item { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .fp-faq-q { padding: 1.25rem 1.5rem; font-weight: 700; cursor: pointer; display: flex; justify-content: space-between; }
        .fp-faq-a { padding: 0 1.5rem 1.25rem; color: var(--text-muted); line-height: 1.7; display: none; }
        .fp-faq-item.open .fp-faq-a { display: block; }

        /* Contact form */
        .fp-contact { background: var(--bg); }
        .fp-contact-inner { max-width: 700px; margin: 0 auto; }
        .fp-form { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 3rem; }
        .fp-input {
            padding: 1rem 1.5rem; border-radius: var(--radius);
            border: 1.5px solid var(--border); background: var(--surface);
            font-size: 1rem; color: var(--text); font-family: inherit;
            outline: none; transition: border-color 0.2s;
        }
        .fp-input:focus { border-color: var(--primary); }
        .fp-textarea { min-height: 140px; resize: vertical; }
        .fp-form-success { text-align: center; padding: 3rem; color: var(--primary); font-weight: 700; display: none; }

        /* LogoCloud */
        .fp-logos { background: var(--surface); padding: 3rem 2rem; }
        .fp-logos-title { text-align: center; color: var(--text-muted); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 2rem; }
        .fp-logos-grid { display: flex; flex-wrap: wrap; gap: 3rem; justify-content: center; align-items: center; max-width: 900px; margin: 0 auto; }
        .fp-logo-item { font-weight: 800; color: var(--text-muted); font-size: 1.1rem; opacity: 0.6; }

        /* Team */
        .fp-team { background: var(--bg); }
        .fp-member { text-align: center; }
        .fp-member-avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin: 0 auto 1rem; border: 3px solid var(--border); }
        .fp-member-name { font-weight: 800; font-size: 1.1rem; margin-bottom: 0.25rem; }
        .fp-member-role { color: var(--primary); font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .fp-member-bio { color: var(--text-muted); font-size: 0.85rem; }

        /* Newsletter */
        .fp-newsletter { background: var(--primary); padding: 5rem 2rem; text-align: center; color: #fff; }
        .fp-newsletter h2 { color: #fff; font-size: 2.5rem; margin-bottom: 1rem; }
        .fp-newsletter p { opacity: 0.85; margin-bottom: 2rem; font-size: 1.1rem; }
        .fp-newsletter-form { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; max-width: 500px; margin: 0 auto; }
        .fp-newsletter-input {
            flex: 1; min-width: 220px;
            padding: 1rem 1.5rem; border-radius: 100px;
            border: none; font-size: 1rem; outline: none;
        }

        /* CTA */
        .fp-cta { background: var(--primary); padding: 5rem 2rem; text-align: center; }
        .fp-cta h2 { color: #fff; font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 1rem; }
        .fp-cta p { color: rgba(255,255,255,0.85); font-size: 1.1rem; margin-bottom: 2.5rem; }
        .fp-cta-btn { background: #fff; color: var(--primary); }
        .fp-cta-btn:hover { background: rgba(255,255,255,0.9); }

        /* Location */
        .fp-location { background: var(--surface); }
        .fp-location-detail { color: var(--text-muted); margin: 0.5rem 0; font-size: 1rem; }

        /* ApartmentsGrid */
        .fp-apartments { background: var(--bg); }
        .fp-apt-card { background: var(--surface); border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
        .fp-apt-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
        .fp-apt-body { padding: 1.5rem; }
        .fp-apt-title { font-size: 1.1rem; font-weight: 800; margin-bottom: 0.25rem; }
        .fp-apt-location { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem; }
        .fp-apt-price { font-weight: 900; color: var(--primary); font-size: 1.1rem; }

        /* Footer */
        .fp-footer { background: #0f172a; color: #94a3b8; padding: 3rem 2rem; text-align: center; }
        .fp-footer-brand { font-weight: 900; font-size: 1.5rem; color: #f8fafc; margin-bottom: 1rem; }
        .fp-footer-links { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; margin: 1rem 0; }
        .fp-footer-links a { color: #64748b; font-size: 0.85rem; transition: color 0.2s; }
        .fp-footer-links a:hover { color: var(--primary); }
        .fp-footer-copy { font-size: 0.75rem; opacity: 0.5; margin-top: 1.5rem; }

        /* Section headers */
        .fp-section-header { text-align: center; margin-bottom: 3rem; }
        .fp-section-header h2 { font-size: clamp(2rem, 3vw, 2.8rem); margin-bottom: 0.75rem; }
        .fp-section-header p { color: var(--text-muted); font-size: 1.1rem; max-width: 600px; margin: 0 auto; }

        /* Mobile */
        @media (max-width: 768px) {
            .fp-nav-links { display: none; }
            .fp-hero h1 { font-size: 2.2rem; }
            .fp-stats .grid-4 { grid-template-columns: 1fr 1fr; }
            .fp-hero-ctas { flex-direction: column; align-items: center; }
        }
    </style>
</head>
<body>
${blocksHtml}
<script>
    // FAQ accordion
    document.querySelectorAll('.fp-faq-q').forEach(function(q) {
        q.addEventListener('click', function() {
            var item = this.closest('.fp-faq-item');
            item.classList.toggle('open');
        });
    });

    // Contact form submission
    var forms = document.querySelectorAll('.fp-form');
    forms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var success = form.parentNode.querySelector('.fp-form-success');
            if (success) {
                form.style.display = 'none';
                success.style.display = 'block';
            }
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
        a.addEventListener('click', function(e) {
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
</script>
</body>
</html>`;
}

// ─── Block Renderers ───────────────────────────────────────────────────────────

function renderBlock(block: BlockInstance, config: SiteConfigV1): string {
    const d = block.data;
    switch (block.type) {
        case 'Navigation': return renderNavigation(d, config);
        case 'Hero': return renderHero(d);
        case 'Stats': return renderStats(d);
        case 'Features': return renderFeatures(d);
        case 'Testimonials': return renderTestimonials(d);
        case 'Gallery': return renderGallery(d);
        case 'Pricing': return renderPricing(d);
        case 'FAQ': return renderFAQ(d);
        case 'CTA': return renderCTA(d);
        case 'ContactForm': return renderContactForm(d);
        case 'ContactFooter': return renderFooter(d, config);
        case 'Location': return renderLocation(d);
        case 'LogoCloud': return renderLogoCloud(d);
        case 'Team': return renderTeam(d);
        case 'NewsletterSignup': return renderNewsletter(d);
        case 'ApartmentsGrid': return renderApartments(d);
        case 'AvailabilityCalendar': return renderAvailabilityCalendar(d);
        case 'TrustBadges': return renderTrustBadges(d);
        default: return renderUnsupportedBlock(block.type, d);
    }
}

function esc(s: any): string {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderNavigation(d: any, config: SiteConfigV1): string {
    const links = (d.links ?? []).map((l: any) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('');
    const cta = d.ctaLabel ? `<a href="${esc(d.ctaHref ?? '#')}" class="fp-btn" style="padding:0.6rem 1.5rem;font-size:0.85rem;">${esc(d.ctaLabel)}</a>` : '';
    return `<nav class="fp-nav" id="top">
    <span class="fp-nav-brand">${esc(d.brandName ?? config.globalData.brandName)}</span>
    <div class="fp-nav-links">${links}</div>
    ${cta}
</nav>`;
}

function renderHero(d: any): string {
    const bg = d.imageUrl ? `background-image:url('${esc(d.imageUrl)}');background-size:cover;background-position:center;` : '';
    return `<section class="fp-hero">
    <div class="fp-hero-bg" style="${bg}"></div>
    <div class="fp-hero-overlay"></div>
    <div class="fp-hero-content fade-up">
        ${d.kicker ? `<span class="fp-hero-kicker">${esc(d.kicker)}</span>` : ''}
        <h1>${esc(d.title ?? 'Tu Título Aquí')}</h1>
        <p>${esc(d.subtitle ?? '')}</p>
        <div class="fp-hero-ctas">
            ${d.ctaLabel ? `<a href="${esc(d.ctaHref ?? '#')}" class="fp-btn">${esc(d.ctaLabel)}</a>` : ''}
            ${d.secondaryCtaLabel ? `<a href="${esc(d.secondaryCtaHref ?? '#')}" class="fp-hero-cta-secondary">${esc(d.secondaryCtaLabel)}</a>` : ''}
        </div>
    </div>
</section>`;
}

function renderUnsupportedBlock(type: string, d: any): string {
    return `<section class="fp-section">
    <div class="container">
      <div style="border:1px dashed var(--border);border-radius:var(--radius);padding:2rem;background:var(--surface);text-align:center;">
        <div style="display:inline-block;padding:0.45rem 0.9rem;border-radius:999px;background:color-mix(in srgb, var(--primary) 12%, white);color:var(--primary);font-size:0.72rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">${esc(type)}</div>
        <h3 style="margin-top:1rem;font-size:1.4rem;">Bloque visible en editor</h3>
        <p style="margin-top:0.75rem;color:var(--text-muted);max-width:42rem;margin-left:auto;margin-right:auto;">${esc(d?.title ?? 'Este bloque aun no tenia una version HTML propia para preview/export. Ahora mostramos un placeholder para que no desaparezca en la vista previa.')}</p>
      </div>
    </div>
  </section>`;
}

function renderAvailabilityCalendar(d: any): string {
    return `<section class="fp-section" id="availability">
    <div class="container">
      <div class="fp-features-header">
        <h2>${esc(d.title ?? 'Disponibilidad')}</h2>
        <p>Consulta el estado actual y elige la mejor fecha para continuar.</p>
      </div>
      <div style="max-width:760px;margin:0 auto;border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;background:var(--surface);box-shadow:0 10px 30px rgba(15,23,42,0.05);">
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0.65rem;text-align:center;font-size:0.8rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">
          <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0.65rem;margin-top:0.85rem;">
          ${Array.from({ length: 28 }, (_, i) => {
              const day = i + 1;
              const available = ![5, 6, 12, 13, 19, 20].includes(day);
              return `<div style="aspect-ratio:1;border-radius:16px;border:1px solid ${available ? 'var(--border)' : 'transparent'};display:flex;align-items:center;justify-content:center;background:${available ? 'var(--bg)' : 'color-mix(in srgb, var(--primary) 14%, white)'};color:${available ? 'var(--text)' : 'var(--primary)'};font-weight:800;">${day}</div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </section>`;
}

function renderTrustBadges(d: any): string {
    const badges = d.badges ?? ['Pago seguro', 'Soporte real', 'SSL activo', 'Datos protegidos'];
    return `<section class="fp-section">
    <div class="container">
      <div class="fp-features-header">
        <h2>${esc(d.title ?? 'Confianza visible')}</h2>
        <p>${esc(d.subtitle ?? 'Refuerza conversion con senales claras de seguridad y credibilidad.')}</p>
      </div>
      <div class="grid-4">
        ${badges.map((badge: string) => `<div style="padding:1.25rem;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);text-align:center;font-weight:800;">${esc(badge)}</div>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderStats(d: any): string {
    const items = (d.items ?? []).map((i: any) => `
    <div class="fp-stat">
        <div class="fp-stat-value">${esc(i.value)}</div>
        <div class="fp-stat-label">${esc(i.label)}</div>
    </div>`).join('');
    return `<section class="fp-stats"><div class="grid-4">${items}</div></section>`;
}

function renderFeatures(d: any): string {
    const items = (d.features ?? []).map((f: any) => `
    <div class="fp-feature-card">
        <div class="fp-feature-icon">${esc(f.icon ?? '⚡')}</div>
        <h3 class="fp-feature-title">${esc(f.title)}</h3>
        <p class="fp-feature-desc">${esc(f.description)}</p>
    </div>`).join('');
    return `<section class="fp-section fp-features">
    <div class="container">
        <div class="fp-section-header">
            <h2>${esc(d.title ?? '')}</h2>
            ${d.subtitle ? `<p>${esc(d.subtitle)}</p>` : ''}
        </div>
        <div class="grid-3">${items}</div>
    </div>
</section>`;
}

function renderTestimonials(d: any): string {
    const items = (d.testimonials ?? []).map((t: any) => `
    <div class="fp-testimonial-card">
        <div class="fp-testimonial-stars">${'★'.repeat(t.rating ?? 5)}</div>
        <p class="fp-testimonial-text">"${esc(t.text)}"</p>
        <div class="fp-testimonial-name">${esc(t.name)}</div>
        ${t.role ? `<div class="fp-testimonial-role">${esc(t.role)}</div>` : ''}
    </div>`).join('');
    return `<section class="fp-section fp-testimonials">
    <div class="container">
        <div class="fp-section-header"><h2>${esc(d.title ?? 'Testimonios')}</h2></div>
        <div class="grid-3">${items}</div>
    </div>
</section>`;
}

function renderGallery(d: any): string {
    const images = (d.images ?? []).map((url: string) => `
    <div class="fp-gallery-item">
        <img src="${esc(url)}" alt="Gallery image" loading="lazy">
    </div>`).join('');
    return `<section class="fp-section fp-gallery">
    <div class="container">
        <div class="fp-section-header"><h2>${esc(d.title ?? 'Galería')}</h2></div>
        <div class="fp-gallery-grid">${images}</div>
    </div>
</section>`;
}

function renderPricing(d: any): string {
    const plans = (d.plans ?? []).map((p: any) => `
    <div class="fp-plan${p.featured ? ' featured' : ''}">
        <div class="fp-plan-name">${esc(p.name)}</div>
        <div style="margin-bottom:0.25rem;">
            <span class="fp-plan-price">${esc(p.price)}</span>
            <span class="fp-plan-period">${esc(p.period ?? '')}</span>
        </div>
        <ul class="fp-plan-features">
            ${(p.features ?? []).map((f: string) => `<li class="fp-plan-feature">${esc(f)}</li>`).join('')}
        </ul>
        <a href="#contact" class="fp-btn${p.featured ? '' : ' fp-btn-outline'}" style="width:100%;text-align:center;display:block;margin-top:1.5rem;">${esc(p.cta)}</a>
    </div>`).join('');
    return `<section class="fp-section fp-pricing">
    <div class="fp-pricing-header">
        <h2>${esc(d.title ?? 'Precios')}</h2>
        ${d.subtitle ? `<p style="color:var(--text-muted);margin-top:0.75rem;">${esc(d.subtitle)}</p>` : ''}
    </div>
    <div class="fp-pricing-grid">${plans}</div>
</section>`;
}

function renderFAQ(d: any): string {
    const items = (d.items ?? []).map((item: any, i: number) => `
    <div class="fp-faq-item${i === 0 ? ' open' : ''}">
        <div class="fp-faq-q">${esc(item.question)} <span>▾</span></div>
        <div class="fp-faq-a">${esc(item.answer)}</div>
    </div>`).join('');
    return `<section class="fp-section fp-faq">
    <div class="container">
        <div class="fp-section-header"><h2>${esc(d.title ?? 'FAQ')}</h2></div>
        <div class="fp-faq-list">${items}</div>
    </div>
</section>`;
}

function renderCTA(d: any): string {
    return `<section class="fp-cta" id="cta">
    <div class="container">
        <h2>${esc(d.title ?? '')}</h2>
        ${d.subtitle ? `<p>${esc(d.subtitle)}</p>` : ''}
        ${d.ctaLabel ? `<a href="${esc(d.ctaHref ?? '#contact')}" class="fp-btn fp-cta-btn">${esc(d.ctaLabel)}</a>` : ''}
    </div>
</section>`;
}

function renderContactForm(d: any): string {
    return `<section class="fp-section fp-contact" id="contact">
    <div class="container">
        <div class="fp-contact-inner">
            <div class="fp-section-header">
                <h2>${esc(d.title ?? 'Contacto')}</h2>
                ${d.subtitle ? `<p>${esc(d.subtitle)}</p>` : ''}
            </div>
            <form class="fp-form" action="#" method="post">
                <input type="text" class="fp-input" placeholder="Tu nombre" required>
                <input type="email" class="fp-input" placeholder="tu@email.com" required>
                <textarea class="fp-input fp-textarea" placeholder="Tu mensaje" required></textarea>
                <button type="submit" class="fp-btn">${esc(d.submitLabel ?? 'Enviar mensaje')}</button>
            </form>
            <div class="fp-form-success">
                <p style="font-size:3rem">✅</p>
                <p>¡Mensaje recibido! Te contactamos pronto.</p>
            </div>
        </div>
    </div>
</section>`;
}

function renderFooter(d: any, config: SiteConfigV1): string {
    const links = (d.links ?? []).map((l: any) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('');
    return `<footer class="fp-footer">
    <div class="fp-footer-brand">${esc(d.brandName ?? config.globalData.brandName)}</div>
    ${d.email ? `<p>${esc(d.email)}</p>` : ''}
    ${d.phone ? `<p>${esc(d.phone)}</p>` : ''}
    ${d.address ? `<p>${esc(d.address)}</p>` : ''}
    ${links ? `<div class="fp-footer-links">${links}</div>` : ''}
    <p class="fp-footer-copy">Powered by <strong>WebPro</strong> · ${new Date().getFullYear()}</p>
</footer>`;
}

function renderLocation(d: any): string {
    return `<section class="fp-section fp-location" id="location">
    <div class="container" style="text-align:center">
        <div class="fp-section-header"><h2>${esc(d.title ?? 'Ubicación')}</h2></div>
        ${d.address ? `<p class="fp-location-detail">📍 ${esc(d.address)}</p>` : ''}
        ${d.phone ? `<p class="fp-location-detail">📞 ${esc(d.phone)}</p>` : ''}
        ${d.hours ? `<p class="fp-location-detail">🕐 ${esc(d.hours)}</p>` : ''}
    </div>
</section>`;
}

function renderLogoCloud(d: any): string {
    const logos = (d.logos ?? []).map((l: string) => `<span class="fp-logo-item">${esc(l)}</span>`).join('');
    return `<div class="fp-logos">
    <p class="fp-logos-title">${esc(d.title ?? '')}</p>
    <div class="fp-logos-grid">${logos}</div>
</div>`;
}

function renderTeam(d: any): string {
    const members = (d.members ?? []).map((m: any) => `
    <div class="fp-member">
        <img src="${esc(m.avatar ?? 'https://i.pravatar.cc/200')}" alt="${esc(m.name)}" class="fp-member-avatar">
        <h3 class="fp-member-name">${esc(m.name)}</h3>
        <p class="fp-member-role">${esc(m.role)}</p>
        <p class="fp-member-bio">${esc(m.bio)}</p>
    </div>`).join('');
    return `<section class="fp-section fp-team" id="team">
    <div class="container">
        <div class="fp-section-header"><h2>${esc(d.title ?? 'Equipo')}</h2></div>
        <div class="grid-3">${members}</div>
    </div>
</section>`;
}

function renderNewsletter(d: any): string {
    return `<section class="fp-newsletter" id="newsletter">
    <div class="container">
        <h2>${esc(d.title ?? '¡Suscríbete!')}</h2>
        <p>${esc(d.subtitle ?? '')}</p>
        <form class="fp-newsletter-form" onsubmit="this.innerHTML='<p style=color:#fff;font-weight:700>✅ ¡Suscrito! Gracias.</p>';return false;">
            <input type="email" class="fp-newsletter-input" placeholder="${esc(d.placeholder ?? 'tu@email.com')}" required>
            <button type="submit" class="fp-btn" style="background:#fff;color:var(--primary);">${esc(d.ctaLabel ?? 'Suscribirme')}</button>
        </form>
    </div>
</section>`;
}

function renderApartments(d: any): string {
    const items = (d.items ?? []).map((item: any) => `
    <div class="fp-apt-card">
        <img src="${esc(item.image ?? '')}" alt="${esc(item.title)}" class="fp-apt-img" loading="lazy">
        <div class="fp-apt-body">
            <h3 class="fp-apt-title">${esc(item.title)}</h3>
            <p class="fp-apt-location">${esc(item.location ?? '')}</p>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="fp-apt-price">${esc(item.price)}</span>
                <a href="#contact" class="fp-btn" style="padding:0.5rem 1.25rem;font-size:0.85rem;">Reservar</a>
            </div>
        </div>
    </div>`).join('');
    return `<section class="fp-section fp-apartments" id="apartments">
    <div class="container">
        <div class="fp-section-header">
            <h2>${esc(d.title ?? 'Propiedades')}</h2>
            ${d.subtitle ? `<p>${esc(d.subtitle)}</p>` : ''}
        </div>
        <div class="grid-3">${items}</div>
    </div>
</section>`;
}

// ─── Download helper (browser only) ───────────────────────────────────────────

export function downloadHtml(config: SiteConfigV1, filename?: string): void {
    const html = exportHtml(config);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `${config.slug || 'mi-sitio'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export each page as a separate .html file (for multi-page sites).
 * Downloads them one by one with 200ms delay to avoid browser blocking.
 */
export function downloadAllPages(config: SiteConfigV1): void {
    const pages = Object.keys(config.pages);
    pages.forEach((slug, i) => {
        const pageConfig: SiteConfigV1 = {
            ...config,
            pages: { '/': config.pages[slug] },
        };
        const filename = slug === '/'
            ? `${config.slug || 'sitio'}-inicio.html`
            : `${config.slug || 'sitio'}${slug.replace(/\//g, '-')}.html`;

        setTimeout(() => downloadHtml(pageConfig, filename), i * 250);
    });
}

// ─── Export project as ZIP (HTML + assets listing) ────────────────────────────

export function downloadProjectJson(config: SiteConfigV1): void {
    const json = JSON.stringify({ webpro: '1.0', exportedAt: new Date().toISOString(), config }, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.slug || 'sitio'}-webpro.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
