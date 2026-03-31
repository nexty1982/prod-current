import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Phone, MapPin, Clock } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, CTASection } from '@/components/frontend-pages/shared/sections';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import PageContainer from '@/shared/ui/PageContainer';
import axios from 'axios';
import React, { useState } from 'react';

const ENQUIRY_TYPES = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'parish_registration', label: 'Parish Registration' },
  { value: 'records', label: 'Records & Certificates' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'billing', label: 'Billing & Pricing' },
  { value: 'other', label: 'Other' },
];

const Contact = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    enquiryType: 'general',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (feedback) setFeedback(null);
  };

  const validate = (): string | null => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.phone.trim()) return 'Phone number is required.';
    if (!form.message.trim()) return 'Please enter a message.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFeedback({ type: 'error', text: err });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await axios.post('/api/contact', form);
      setFeedback({ type: 'success', text: 'Thank you! Your message has been sent. We will get back to you shortly.' });
      setForm({ firstName: '', lastName: '', phone: '', email: '', enquiryType: 'general', message: '' });
    } catch (error: any) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Failed to send message. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title="Contact" description="Contact Orthodox Metrics">
      {/* Hero */}
      <HeroSection
        badge="Contact Us"
        title="We'd Love to Hear from You"
        subtitle="Whether you're ready to register your parish, have questions about the platform, or need technical support, we're here to help."
        editKeyPrefix="contact.hero"
      />

      {/* Form + Info Panel */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <h2 className="font-['Georgia'] text-3xl text-[#2d1b4e] dark:text-white mb-2">Send a Message</h2>
              <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 mb-8">
                Fill out the form below and we'll respond as soon as possible.
              </p>

              {feedback && (
                <div className={`mb-6 px-4 py-3 rounded-lg border font-['Inter'] text-[15px] ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span>{feedback.text}</span>
                    <button onClick={() => setFeedback(null)} className="ml-4 text-current opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer text-lg leading-none">&times;</button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField label="First Name" id="fname" placeholder="Your first name" value={form.firstName} onChange={handleChange('firstName')} required />
                  <FormField label="Last Name" id="lname" placeholder="Your last name" value={form.lastName} onChange={handleChange('lastName')} required />
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField label="Phone Number" id="phone" placeholder="(555) 123-4567" value={form.phone} onChange={handleChange('phone')} required />
                  <FormField label="Email" id="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange('email')} required />
                </div>

                <div>
                  <label htmlFor="enquiry" className="block font-['Inter'] text-[14px] font-medium text-[#2d1b4e] dark:text-white mb-2">
                    Enquiry Type
                  </label>
                  <select
                    id="enquiry"
                    value={form.enquiryType}
                    onChange={handleChange('enquiryType')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#2d1b4e] dark:text-white font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] dark:focus:ring-[#d4af37] focus:border-transparent transition-colors appearance-none"
                  >
                    {ENQUIRY_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block font-['Inter'] text-[14px] font-medium text-[#2d1b4e] dark:text-white mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    placeholder="Tell us how we can help..."
                    value={form.message}
                    onChange={handleChange('message')}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#2d1b4e] dark:text-white font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] dark:focus:ring-[#d4af37] focus:border-transparent transition-colors resize-vertical"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#3a2461] dark:hover:bg-[#c29d2f] transition-colors disabled:opacity-50 cursor-pointer border-0"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Info Panel */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-800 dark:via-gray-750 dark:to-gray-700 rounded-2xl p-8 text-white h-full">
                <h3 className="font-['Georgia'] text-2xl mb-2">Get in Touch</h3>
                <p className="font-['Inter'] text-[15px] text-[rgba(255,255,255,0.7)] mb-8 leading-relaxed">
                  Have questions or need assistance? We're here to help you get started with Orthodox Metrics.
                </p>

                <div className="space-y-6">
                  <ContactInfoItem icon={Mail} label="Email" value="support@orthodoxmetrics.com" />
                  <ContactInfoItem icon={Phone} label="Phone" value="Available upon request" />
                  <ContactInfoItem icon={MapPin} label="Location" value="United States" />
                  <ContactInfoItem icon={Clock} label="Response Time" value="Within 24 hours" />
                </div>

                <div className="mt-10 pt-8 border-t border-white/10">
                  <h4 className="font-['Inter'] font-medium text-[15px] text-[#d4af37] mb-3">Ready to register?</h4>
                  <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
                    If your parish is ready to get started, select "Parish Registration" from the enquiry type and we'll walk you through the process.
                  </p>
                  <Link
                    to={PUBLIC_ROUTES.PRICING}
                    className="inline-flex items-center gap-2 font-['Inter'] text-[14px] text-[#d4af37] hover:text-[#e8c84a] transition-colors no-underline"
                  >
                    View pricing plans
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title="Ready to Get Started?"
        subtitle="Join Orthodox parishes across North America already preserving their records with Orthodox Metrics."
        editKeyPrefix="contact.cta"
      >
        <Link
          to={PUBLIC_ROUTES.TOUR}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors no-underline"
        >
          Take the Tour
          <ArrowRight size={20} />
        </Link>
        <Link
          to={PUBLIC_ROUTES.PRICING}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors no-underline"
        >
          View Pricing
        </Link>
      </CTASection>

      <ScrollToTop />
    </PageContainer>
  );
};

export default Contact;

// ── Local sub-components ──

function FormField({ label, id, placeholder, value, onChange, type = 'text', required }: {
  label: string; id: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-['Inter'] text-[14px] font-medium text-[#2d1b4e] dark:text-white mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#2d1b4e] dark:text-white font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] dark:focus:ring-[#d4af37] focus:border-transparent transition-colors"
      />
    </div>
  );
}

function ContactInfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-[rgba(212,175,55,0.15)] rounded-lg flex items-center justify-center">
        <Icon className="text-[#d4af37]" size={20} />
      </div>
      <div>
        <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.5)] mb-0.5">{label}</p>
        <p className="font-['Inter'] text-[15px] text-white">{value}</p>
      </div>
    </div>
  );
}
