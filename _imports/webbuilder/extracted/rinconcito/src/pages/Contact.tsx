import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../content/brand';
import { MapPin, Mail, Phone, Instagram, Facebook, Clock, Sparkles, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { RentikBadge } from '../components/RentikBadge';
import { createLead, IS_DEMO } from '../integrations/rentikpro/api';
import { DemoModeBadge } from '../components/DemoModeBadge';

const Contact: React.FC = () => {
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { t, i18n } = useTranslation();

  return (
    <div className="bg-stone-50 min-h-screen pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Section */}
        <div className="max-w-3xl mb-20">
          <span className="text-orange-700 font-bold tracking-[0.2em] text-sm uppercase mb-4 block underline decoration-orange-200 underline-offset-8">{t('contact.title')}</span>
          <h1 className="font-serif text-5xl md:text-7xl text-stone-900 mb-8 font-bold leading-[1.1]">{t('contact.header_title')}</h1>
          <p className="text-stone-500 text-xl font-light leading-relaxed">
            {t('contact.header_desc')}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-16 lg:gap-24 items-start">

          {/* Column 1: Contact Info & Experience */}
          <div className="lg:col-span-5 space-y-12">
            <div className="bg-stone-900 text-white rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-700/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>

              <div className="relative z-10 space-y-12">
                <div>
                  <h3 className="font-serif text-3xl mb-10 text-orange-200">{t('contact_page.brand_name')}</h3>
                  <div className="space-y-8">
                    <div className="flex items-start gap-6 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0 group-hover:bg-orange-700 transition-colors">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-lg mb-1">{BRAND.contact.city}</p>
                        <p className="text-stone-400 font-light leading-relaxed">
                          {BRAND.contact.address}<br />
                          {BRAND.contact.zip}, {BRAND.contact.province}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0 group-hover:bg-orange-700 transition-colors">
                        <Phone size={24} />
                      </div>
                      <p className="text-xl font-light tracking-tight">{BRAND.contact.phone}</p>
                    </div>

                    <div className="flex items-center gap-6 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0 group-hover:bg-orange-700 transition-colors">
                        <Mail size={24} />
                      </div>
                      <p className="text-lg font-light break-all">{BRAND.contact.email}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-12 border-t border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <Instagram size={24} className="text-stone-400 hover:text-white transition-colors cursor-pointer" />
                    <Facebook size={24} className="text-stone-400 hover:text-white transition-colors cursor-pointer" />
                  </div>
                  <RentikBadge theme="transparent" />
                </div>
              </div>
            </div>

            {/* Extra Info Box */}
            <div className="bg-stone-100 rounded-[2.5rem] p-10 border border-stone-200 flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-stone-900 shadow-sm shrink-0">
                <Clock size={32} />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 mb-1">{t('contact.office_hours')}</h4>
                <p className="text-stone-500 text-sm font-light">{t('contact.hours_range')}</p>
                <p className="text-orange-700 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                  <Sparkles size={12} /> {t('contact.chat_available')}
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: The Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[3rem] border border-stone-100 shadow-xl p-10 md:p-16 relative overflow-hidden group">
              {/* Decorative background number or element */}
              <div className="absolute -top-10 -right-10 text-[20rem] font-serif text-stone-50 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 select-none">@</div>

              <div className="relative z-10">
                <h2 className="font-serif text-3xl text-stone-900 mb-6">{t('contact.form_title')}</h2>
                {IS_DEMO && <div className="mb-8"><DemoModeBadge /></div>}

                <form
                  className="space-y-8"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (formState === 'sending') return;
                    const form = e.currentTarget;
                    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                    const phone = (form.elements.namedItem('phone') as HTMLInputElement)?.value;
                    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value;
                    setFormState('sending');
                    setErrorMsg('');
                    const result = await createLead({ name, email, phone, message, language: i18n.resolvedLanguage ?? 'es', source: 'web-contact' });
                    if (result.data?.success) {
                      setFormState('sent');
                      form.reset();
                    } else {
                      setFormState('error');
                      setErrorMsg(result.error ?? result.data?.message ?? 'Error al enviar. Inténtalo de nuevo.');
                    }
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 ml-4">{t('contact.form.name_label')}</label>
                      <input
                        type="text"
                        name="name"
                        placeholder={t('contact.form.name_placeholder')}
                        required
                        className="w-full px-8 py-5 rounded-2xl bg-stone-50 border border-stone-100 focus:outline-none focus:bg-white focus:border-orange-400 focus:shadow-xl focus:shadow-orange-900/5 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 ml-4">{t('contact.form.email_label')}</label>
                      <input
                        type="email"
                        name="email"
                        placeholder={t('contact.form.email_placeholder')}
                        required
                        className="w-full px-8 py-5 rounded-2xl bg-stone-50 border border-stone-100 focus:outline-none focus:bg-white focus:border-orange-400 focus:shadow-xl focus:shadow-orange-900/5 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 ml-4">{t('contact.form.help_label')}</label>
                    <textarea
                      rows={5}
                      name="message"
                      placeholder={t('contact.form.message_placeholder')}
                      required
                      className="w-full px-8 py-5 rounded-2xl bg-stone-50 border border-stone-100 focus:outline-none focus:bg-white focus:border-orange-400 focus:shadow-xl focus:shadow-orange-900/5 transition-all outline-none resize-none"
                    ></textarea>
                  </div>

                  {formState === 'error' && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
                      <AlertCircle size={18} className="text-red-500 shrink-0" />
                      <p className="text-red-700 text-sm">{errorMsg}</p>
                    </div>
                  )}

                  {formState === 'sent' ? (
                    <div className="flex items-center gap-3 p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                      <CheckCircle size={22} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-emerald-800 font-semibold">{t('common.sent_ok_title')}</p>
                        <p className="text-emerald-600 text-sm mt-0.5">{t('common.response_time')}</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={formState === 'sending'}
                      className="w-full bg-stone-900 text-white font-bold py-6 rounded-2xl hover:bg-orange-700 transition-all text-lg shadow-2xl hover:shadow-orange-900/40 transform hover:-translate-y-1 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                    >
                      {formState === 'sending' ? (
                        <><Loader2 size={20} className="animate-spin" /> {t('contact.form.sending')}</>
                      ) : (
                        t('contact.form.send')
                      )}
                    </button>
                  )}
                </form>

                <div className="mt-12 text-center text-stone-400 text-sm font-light italic">
                  "{t('contact.tagline')}"
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;