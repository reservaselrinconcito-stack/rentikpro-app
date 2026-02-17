import { MarketingEmailTemplate, UserSettings, EmailTemplateSpec } from '../types';

export const renderTemplateSpecToEmailHtml = (
    spec: EmailTemplateSpec,
    settings: UserSettings,
    recipientName: string
): string => {
    // --- STYLES ---
    const containerStyle = "max-width: 600px; margin: 0 auto; font-family: sans-serif; background-color: #ffffff; border: 1px solid #e2e8f0;";
    const headerStyle = "background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 1px solid #e2e8f0;";
    const heroStyle = "padding: 0; background-color: #eef2ff; text-align: center;";
    const heroImgStyle = "width: 100%; height: auto; display: block; max-height: 250px; object-fit: cover;";
    const heroContentStyle = "padding: 30px 20px;";
    const bodyStyle = "padding: 30px 20px; color: #334155; line-height: 1.6; font-size: 16px;";
    const offerStyle = "background-color: #fff1f2; border: 1px dashed #f43f5e; padding: 20px; margin: 20px; text-align: center; border-radius: 8px;";
    const ctaStyle = "text-align: center; padding: 20px;";
    const buttonStyle = "display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;";
    const footerStyle = "background-color: #0f172a; color: #94a3b8; padding: 30px 20px; text-align: center; font-size: 12px;";

    // --- CONTENT PREP ---
    const businessName = spec.header.business_name || settings.business_name || 'RentikPro';
    const heroTitle = spec.hero.title;
    const heroSubtitle = spec.hero.subtitle;

    // Replace variables
    let bodyText = spec.body.text.replace(/{{nombre}}/g, recipientName);
    bodyText = bodyText.replace(/\n/g, '<br/>');

    // --- BUILD HTML ---
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
  <div style="${containerStyle}">
    <!-- HEADER -->
    <div style="${headerStyle}">
      <h1 style="margin: 0; color: #0f172a; font-size: 20px;">${businessName}</h1>
    </div>

    <!-- HERO -->
    <div style="${heroStyle}">
      ${spec.hero.image_media_id
            ? `<div style="background-color: #cbd5e1; height: 200px; display: flex; align-items: center; justify-content: center; color: #64748b;">(Imagen: ${spec.hero.image_media_id})</div>`
            : ''} 
      <div style="${heroContentStyle}">
        <h2 style="margin: 0 0 10px 0; color: #1e293b; font-size: 24px;">${heroTitle}</h2>
        <p style="margin: 0; color: #64748b; font-size: 18px;">${heroSubtitle}</p>
      </div>
    </div>

    <!-- BODY -->
    <div style="${bodyStyle}">
      ${bodyText}
    </div>

    <!-- OFFER -->
    ${spec.offer.enabled ? `
    <div style="${offerStyle}">
      <div style="color: #be123c; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 5px;">${spec.offer.badge_text}</div>
      <div style="color: #881337; font-size: 18px;">${spec.offer.detail_text}</div>
    </div>
    ` : ''}

    <!-- CTA -->
    ${spec.cta.enabled ? `
    <div style="${ctaStyle}">
      <a href="${spec.cta.url}" style="${buttonStyle}">${spec.cta.button_text}</a>
    </div>
    ` : ''}

    <!-- FOOTER -->
    <div style="${footerStyle}">
      <p style="margin: 0 0 10px 0;">${businessName}</p>
      <p style="margin: 0 0 10px 0;">${spec.footer.phone} | ${settings.contact_email || 'info@rentikpro.com'}</p>
      ${spec.footer.social_links.length > 0 ? `<p style="margin: 0 0 20px 0;">Síguenos en: ${spec.footer.social_links.join(' · ')}</p>` : ''}
      
      ${spec.footer.unsubscription_notice ? `
      <div style="border-top: 1px solid #334155; margin-top: 20px; padding-top: 20px; color: #64748b;">
        <p>Recibes este email porque te has alojado con nosotros.</p>
        <p>Si deseas dejar de recibir estas comunicaciones, <a href="#" style="color: #94a3b8; text-decoration: underline;">haz clic aquí</a>.</p>
      </div>
      ` : ''}
      
      <p style="margin-top: 20px; font-size: 10px; opacity: 0.5;">Enviado con RentikPro</p>
    </div>
  </div>
</body>
</html>
  `;
};
