import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(212,175,55,0.15)] px-4 py-2 rounded-full mb-6">
            <span className="font-['Inter'] text-[14px] text-[#d4af37]">Get in Touch</span>
          </div>
          <h1 className="font-['Georgia'] text-5xl md:text-6xl mb-6">
            We're Here to Help
          </h1>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-2xl mx-auto">
            Have questions about Orthodox Metrics? Our team is ready to assist your parish
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="font-['Georgia'] text-3xl text-[#2d1b4e] mb-6">Send Us a Message</h2>
              <p className="font-['Inter'] text-[16px] text-[#4a5565] mb-8">
                Fill out the form below and we'll get back to you within 24 hours.
              </p>

              <form className="space-y-6">
                <div>
                  <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent"
                    placeholder="Fr. John Smith"
                  />
                </div>

                <div>
                  <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent"
                    placeholder="email@parish.org"
                  />
                </div>

                <div>
                  <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] mb-2">
                    Parish Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent"
                    placeholder="St. Nicholas Orthodox Church"
                  />
                </div>

                <div>
                  <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] mb-2">
                    What can we help you with? *
                  </label>
                  <select className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent">
                    <option>Request a Demo</option>
                    <option>General Inquiry</option>
                    <option>Pricing Information</option>
                    <option>Technical Support</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-['Inter'] font-medium text-[15px] text-[#2d1b4e] mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent resize-none"
                    placeholder="Tell us about your parish and how we can help..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-[#2d1b4e] text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#1f1236] transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="font-['Georgia'] text-3xl text-[#2d1b4e] mb-6">Contact Information</h2>
              <p className="font-['Inter'] text-[16px] text-[#4a5565] mb-8">
                Prefer to reach out directly? Here's how to get in touch with our team.
              </p>

              <div className="space-y-8">
                <ContactInfo
                  icon={<Mail className="text-[#d4af37]" size={24} />}
                  title="Email Us"
                  info="support@orthodoxmetrics.com"
                  subtext="We respond within 24 hours"
                />

                <ContactInfo
                  icon={<Phone className="text-[#d4af37]" size={24} />}
                  title="Call Us"
                  info="(555) 123-4567"
                  subtext="Monday - Friday, 9am - 5pm EST"
                />

                <ContactInfo
                  icon={<MapPin className="text-[#d4af37]" size={24} />}
                  title="Mailing Address"
                  info="123 Church Street, Suite 100"
                  subtext="Boston, MA 02118"
                />

                <ContactInfo
                  icon={<Clock className="text-[#d4af37]" size={24} />}
                  title="Business Hours"
                  info="Monday - Friday: 9:00 AM - 5:00 PM EST"
                  subtext="Closed on major Orthodox feast days"
                />
              </div>

              <div className="mt-12 p-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] rounded-2xl border border-[rgba(45,27,78,0.1)]">
                <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] mb-4">
                  Schedule a Demo
                </h3>
                <p className="font-['Inter'] text-[15px] text-[#4a5565] mb-6">
                  See Orthodox Metrics in action with a personalized walkthrough for your parish.
                </p>
                <button className="w-full px-6 py-3 bg-[#2d1b4e] text-white rounded-lg font-['Inter'] font-medium hover:bg-[#1f1236] transition-colors">
                  Book a Demo Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[#f9fafb]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-['Georgia'] text-4xl text-[#2d1b4e] mb-4">
              Common Questions
            </h2>
            <p className="font-['Inter'] text-lg text-[#4a5565]">
              Quick answers to questions you may have
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "How long does it take to get started?",
                a: "Most parishes are up and running within 1-2 weeks. We provide onboarding support to help you through the initial setup.",
              },
              {
                q: "Do you offer help with digitizing existing records?",
                a: "Yes! We can connect you with professional digitization services or guide your team through the process.",
              },
              {
                q: "Is my data secure?",
                a: "Absolutely. We use bank-level encryption, regular backups, and comply with all data protection regulations.",
              },
              {
                q: "Can I try before I buy?",
                a: "Yes, we offer a 30-day free trial with full access to all features.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 border border-[#f3f4f6] shadow-sm">
                <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] mb-2">{faq.q}</h3>
                <p className="font-['Inter'] text-[15px] text-[#4a5565] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ContactInfo({ icon, title, info, subtext }: { icon: React.ReactNode; title: string; info: string; subtext: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-[#2d1b4e] rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] mb-1">{title}</h3>
        <p className="font-['Inter'] text-[15px] text-[#4a5565] mb-1">{info}</p>
        <p className="font-['Inter'] text-[13px] text-[#6b7280]">{subtext}</p>
      </div>
    </div>
  );
}
