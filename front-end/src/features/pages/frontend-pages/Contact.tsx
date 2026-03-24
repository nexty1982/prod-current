import { useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { HeroSection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import apiClient from '@/api/utils/axiosInstance';
import { useLanguage } from '@/context/LanguageContext';
import { useEditMode } from '@/context/EditModeContext';
import { useAuth } from '@/hooks/useAuth';

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
                  <EditableText contentKey="contact.success.title" as="h3" className="font-['Inter'] font-medium text-xl text-green-800 dark:text-green-300 mb-2">{t('contact.success_title')}</EditableText>
                  <EditableText contentKey="contact.success.desc" as="p" className="font-['Inter'] text-[15px] text-green-700 dark:text-green-400">{t('contact.success_desc')}</EditableText>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <FormField labelKey="contact.label.name" label={t('contact.label_name')} name="name" type="text" value={form.name} onChange={handleChange} placeholder={t('contact.placeholder_name')} required />
                  <FormField labelKey="contact.label.email" label={t('contact.label_email')} name="email" type="email" value={form.email} onChange={handleChange} placeholder={t('contact.placeholder_email')} required />
                  <FormField labelKey="contact.label.parish" label={t('contact.label_parish')} name="parish" type="text" value={form.parish} onChange={handleChange} placeholder={t('contact.placeholder_parish')} />
                  <FormField labelKey="contact.label.phone" label={t('contact.label_phone')} name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder={t('contact.placeholder_phone')} />

                  <div>
                    <EditableText contentKey="contact.label.topic" as="label" className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] dark:text-white mb-2">
                      {t('contact.label_topic')}
                    </EditableText>
                    <EditableSelectOptions
                      name="topic"
                      value={form.topic}
                      onChange={handleChange}
                      className="om-select"
                      options={ENQUIRY_VALUES.map((val) => ({
                        value: val,
                        contentKey: `contact.option.${val}`,
                        fallback: t(`contact.option_${val}`),
                      }))}
                    />
                  </div>

                  <div>
                    <EditableText contentKey="contact.label.message" as="label" className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] dark:text-white mb-2">{t('contact.label_message')}</EditableText>
                    <textarea name="message" required rows={6} value={form.message} onChange={handleChange} className="om-textarea" placeholder={t('contact.placeholder_message')} />
                  </div>

                  {status === 'error' && (
                    <EditableText contentKey="contact.error.message" as="p" className="font-['Inter'] text-sm text-red-600 dark:text-red-400">{t('contact.error_message')}</EditableText>
                  )}

                  <button type="submit" disabled={status === 'sending'} className="w-full om-btn-primary disabled:opacity-50">
                    {status === 'sending'
                      ? <EditableText contentKey="contact.btn.sending">{t('contact.btn_sending')}</EditableText>
                      : <EditableText contentKey="contact.btn.send">{t('contact.btn_send')}</EditableText>
                    }
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
                <ContactInfo icon={<Mail className="text-[#d4af37] dark:text-[#2d1b4e]" size={24} />} titleKey="contact.info1.title" infoKey="contact.info1.detail" subtextKey="contact.info1.subtext" title={t('contact.info1_title')} info={t('contact.info1_detail')} subtext={t('contact.info1_subtext')} />
                <ContactInfo icon={<Phone className="text-[#d4af37] dark:text-[#2d1b4e]" size={24} />} titleKey="contact.info2.title" infoKey="contact.info2.detail" subtextKey="contact.info2.subtext" title={t('contact.info2_title')} info={t('contact.info2_detail')} subtext={t('contact.info2_subtext')} />
                <ContactInfo icon={<MapPin className="text-[#d4af37] dark:text-[#2d1b4e]" size={24} />} titleKey="contact.info3.title" infoKey="contact.info3.detail" subtextKey="contact.info3.subtext" title={t('contact.info3_title')} info={t('contact.info3_detail')} subtext={t('contact.info3_subtext')} />
                <ContactInfo icon={<Clock className="text-[#d4af37] dark:text-[#2d1b4e]" size={24} />} titleKey="contact.info4.title" infoKey="contact.info4.detail" subtextKey="contact.info4.subtext" title={t('contact.info4_title')} info={t('contact.info4_detail')} subtext={t('contact.info4_subtext')} />
              </div>

              <div className="mt-12 om-card-elevated p-8">
                <EditableText contentKey="contact.demo.title" as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-4">{t('contact.demo_title')}</EditableText>
                <EditableText contentKey="contact.demo.desc" as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 mb-6">
                  {t('contact.demo_desc')}
                </EditableText>
                <button className="w-full om-btn-primary" onClick={() => { setForm((f) => ({ ...f, topic: 'demo' })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <EditableText contentKey="contact.demo.button">{t('contact.demo_button')}</EditableText>
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
                <EditableText contentKey={`contact.faq${idx}.q`} as="h3" className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">{t(`contact.faq${idx}_q`)}</EditableText>
                <EditableText contentKey={`contact.faq${idx}.a`} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>{t(`contact.faq${idx}_a`)}</EditableText>
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

function FormField({ labelKey, label, name, type, value, onChange, placeholder, required }: {
  labelKey: string; label: string; name: string; type: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string; required?: boolean;
}) {
  return (
    <div>
      <EditableText contentKey={labelKey} as="label" className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] dark:text-white mb-2">{label}</EditableText>
      <input type={type} name={name} value={value} onChange={onChange} required={required} className="om-input" placeholder={placeholder} />
    </div>
  );
}

function EditableSelectOptions({ name, value, onChange, className, options }: {
  name: string; value: string; className: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; contentKey: string; fallback: string }[];
}) {
  const { isEditMode, getContent, updateContent } = useEditMode();
  const { isSuperAdmin } = useAuth();
  const canEdit = isEditMode && isSuperAdmin();

  if (!canEdit) {
    return (
      <select name={name} value={value} onChange={onChange} className={className}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{getContent(opt.contentKey, opt.fallback)}</option>
        ))}
      </select>
    );
  }

  // In edit mode, show the select plus an editable list of option labels below it
  return (
    <div>
      <select name={name} value={value} onChange={onChange} className={className}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{getContent(opt.contentKey, opt.fallback)}</option>
        ))}
      </select>
      <div className="mt-2 space-y-1">
        {options.map((opt) => (
          <EditableText key={opt.value} contentKey={opt.contentKey} as="div" className="text-xs text-[#6b7280] dark:text-gray-500 px-2 py-1 border border-dashed border-[#d4af37]/40 rounded">
            {opt.fallback}
          </EditableText>
        ))}
      </div>
    </div>
  );
}

function ContactInfo({ icon, titleKey, infoKey, subtextKey, title, info, subtext }: {
  icon: React.ReactNode; titleKey: string; infoKey: string; subtextKey: string;
  title: string; info: string; subtext: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div>
        <EditableText contentKey={titleKey} as="h3" className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-1">{title}</EditableText>
        <EditableText contentKey={infoKey} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 mb-1">{info}</EditableText>
        <EditableText contentKey={subtextKey} as="p" className="font-['Inter'] text-[13px] text-[#6b7280] dark:text-gray-500">{subtext}</EditableText>
      </div>
    </div>
  );
}
