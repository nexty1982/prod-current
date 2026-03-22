import { useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { HeroSection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import apiClient from '@/api/utils/axiosInstance';
import { useLanguage } from '@/context/LanguageContext';

const ENQUIRY_VALUES = ['demo', 'general', 'billing', 'technical', 'other'] as const;

const Contact = () => {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', parish: '', phone: '', topic: 'demo', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await apiClient.post('/contact', {
        name: form.name,
        email: form.email,
        parish: form.parish,
        phone: form.phone,
        enquiry_type: form.topic,
        message: form.message,
      });
      setStatus('sent');
      setForm({ name: '', email: '', parish: '', phone: '', topic: 'demo', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      {/* Hero */}
      <HeroSection
        badge={t('contact.hero_badge')}
        title={t('contact.hero_title')}
        subtitle={t('contact.hero_subtitle')}
        editKeyPrefix="contact.hero"
      />

      {/* Contact Form & Info */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Form */}
            <div>
              <EditableText contentKey="contact.form.title" as="h2" className="font-['Georgia'] text-3xl text-[#2d1b4e] dark:text-white mb-6">{t('contact.form_title')}</EditableText>
              <EditableText contentKey="contact.form.desc" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 mb-8">
                {t('contact.form_desc')}
              </EditableText>

              {status === 'sent' ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
                  <h3 className="font-['Inter'] font-medium text-xl text-green-800 dark:text-green-300 mb-2">{t('contact.success_title')}</h3>
                  <p className="font-['Inter'] text-[15px] text-green-700 dark:text-green-400">{t('contact.success_desc')}</p>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <FormField label={t('contact.label_name')} name="name" type="text" value={form.name} onChange={handleChange} placeholder={t('contact.placeholder_name')} required />
                  <FormField label={t('contact.label_email')} name="email" type="email" value={form.email} onChange={handleChange} placeholder={t('contact.placeholder_email')} required />
                  <FormField label={t('contact.label_parish')} name="parish" type="text" value={form.parish} onChange={handleChange} placeholder={t('contact.placeholder_parish')} />
                  <FormField label={t('contact.label_phone')} name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder={t('contact.placeholder_phone')} />

                  <div>
                    <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] dark:text-white mb-2">
                      {t('contact.label_topic')}
                    </label>
                    <select name="topic" value={form.topic} onChange={handleChange} className="om-select">
                      {ENQUIRY_VALUES.map((val) => (
                        <option key={val} value={val}>{t(`contact.option_${val}`)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] dark:text-white mb-2">{t('contact.label_message')}</label>
                    <textarea name="message" required rows={6} value={form.message} onChange={handleChange} className="om-textarea" placeholder={t('contact.placeholder_message')} />
                  </div>

                  {status === 'error' && (
                    <p className="font-['Inter'] text-sm text-red-600 dark:text-red-400">{t('contact.error_message')}</p>
                  )}

                  <button type="submit" disabled={status === 'sending'} className="w-full om-btn-primary disabled:opacity-50">
                    {status === 'sending' ? t('contact.btn_sending') : t('contact.btn_send')}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div>
              <EditableText contentKey="contact.info.title" as="h2" className="font-['Georgia'] text-3xl text-[#2d1b4e] dark:text-white mb-6">{t('contact.info_title')}</EditableText>
              <EditableText contentKey="contact.info.desc" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 mb-8">
                {t('contact.info_desc')}
              </EditableText>
              <div className="space-y-8">
                <ContactInfo icon={<Mail className="text-[#d4af37] dark:text-[#2d1b4e]" size={24} />} title={t('contact.info1_title')} info={t('contact.info1_detail')} subtext={t('contact.info1_subtext')} />
                <ContactInfo icon={<Phone className="text-[#d4af37] dark:text-[#2d1b4e]" size={24} />} title={t('contact.info2_title')} info={t('contact.info2_detail')} subtext={t('contact.info2_subtext')} />
                <ContactInfo icon={<MapPin className="text-[#d4af37] dark:text-[#2d1b4e]" size={24} />} title={t('contact.info3_title')} info={t('contact.info3_detail')} subtext={t('contact.info3_subtext')} />
                <ContactInfo icon={<Clock className="text-[#d4af37] dark:text-[#2d1b4e]" size={24} />} title={t('contact.info4_title')} info={t('contact.info4_detail')} subtext={t('contact.info4_subtext')} />
              </div>

              <div className="mt-12 om-card-elevated p-8">
                <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-4">{t('contact.demo_title')}</h3>
                <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 mb-6">
                  {t('contact.demo_desc')}
                </p>
                <button className="w-full om-btn-primary" onClick={() => { setForm((f) => ({ ...f, topic: 'demo' })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  {t('contact.demo_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditableText contentKey="contact.faq.title" as="h2" className="font-['Georgia'] text-4xl text-[#2d1b4e] dark:text-white mb-4">{t('contact.faq_title')}</EditableText>
            <EditableText contentKey="contact.faq.subtitle" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400">{t('contact.faq_subtitle')}</EditableText>
          </div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-[#f3f4f6] dark:border-gray-700 shadow-sm">
                <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">{t(`contact.faq${idx}_q`)}</h3>
                <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(`contact.faq${idx}_a`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;

// ── Local sub-components ──

function FormField({ label, name, type, value, onChange, placeholder, required }: {
  label: string; name: string; type: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] dark:text-white mb-2">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} className="om-input" placeholder={placeholder} />
    </div>
  );
}

function ContactInfo({ icon, title, info, subtext }: { icon: React.ReactNode; title: string; info: string; subtext: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-1">{title}</h3>
        <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 mb-1">{info}</p>
        <p className="font-['Inter'] text-[13px] text-[#6b7280] dark:text-gray-500">{subtext}</p>
      </div>
    </div>
  );
}
