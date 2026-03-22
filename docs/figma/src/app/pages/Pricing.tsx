import { Link } from "react-router";
import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";
import { Check, HelpCircle } from "lucide-react";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(212,175,55,0.15)] dark:bg-[rgba(212,175,55,0.2)] px-4 py-2 rounded-full mb-6">
            <span className="font-['Inter'] text-[14px] text-[#d4af37]">
              Simple, Transparent Pricing
            </span>
          </div>
          <h1 className="font-['Georgia'] text-5xl md:text-6xl mb-6">
            Plans for Parishes of All Sizes
          </h1>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-2xl mx-auto">
            Choose the plan that fits your parish. All plans include core features, 
            security, and support.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Small Parish */}
            <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <h3 className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-2">
                  Small Parish
                </h3>
                <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">
                  Perfect for parishes with up to 500 families
                </p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="font-['Georgia'] text-5xl text-[#2d1b4e] dark:text-white">$49</span>
                  <span className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">/month</span>
                </div>
                <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 mt-2">
                  Billed annually or $59/month
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Up to 2,000 records",
                  "2 user accounts",
                  "Basic search & filters",
                  "Standard support",
                  "Mobile access",
                  "Data export",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="text-[#d4af37] flex-shrink-0 mt-0.5" size={20} />
                    <span className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className="block w-full text-center px-6 py-3 bg-white dark:bg-gray-700 border-2 border-[#2d1b4e] dark:border-[#d4af37] text-[#2d1b4e] dark:text-[#d4af37] rounded-lg font-['Inter'] font-medium hover:bg-[#2d1b4e] hover:text-white dark:hover:bg-[#d4af37] dark:hover:text-[#2d1b4e] dark:hover:border-[#d4af37] transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Medium Parish - Featured */}
            <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] text-white dark:text-[#2d1b4e] rounded-2xl p-8 relative shadow-xl transform md:scale-105">
              <div className="absolute top-0 right-8 -translate-y-1/2">
                <span className="bg-[#d4af37] dark:bg-[#2d1b4e] text-[#2d1b4e] dark:text-[#d4af37] px-4 py-1.5 rounded-full font-['Inter'] text-[13px] font-medium">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="font-['Inter'] font-medium text-2xl mb-2">
                  Medium Parish
                </h3>
                <p className="font-['Inter'] text-[15px] text-[rgba(255,255,255,0.8)] dark:text-[rgba(45,27,78,0.8)]">
                  Ideal for parishes with 500-1,500 families
                </p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="font-['Georgia'] text-5xl">$99</span>
                  <span className="font-['Inter'] text-[16px] text-[rgba(255,255,255,0.8)] dark:text-[rgba(45,27,78,0.8)]">/month</span>
                </div>
                <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.8)] dark:text-[rgba(45,27,78,0.8)] mt-2">
                  Billed annually or $119/month
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Up to 10,000 records",
                  "5 user accounts",
                  "Advanced search & analytics",
                  "Priority support",
                  "Mobile access",
                  "Data export & import",
                  "Custom fields",
                  "Report generation",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="text-[#d4af37] dark:text-[#2d1b4e] flex-shrink-0 mt-0.5" size={20} />
                    <span className="font-['Inter'] text-[15px]">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className="block w-full text-center px-6 py-3 bg-[#d4af37] dark:bg-[#2d1b4e] text-[#2d1b4e] dark:text-white rounded-lg font-['Inter'] font-medium hover:bg-[#c29d2f] dark:hover:bg-[#1f1236] transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Large Parish */}
            <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <h3 className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-2">
                  Large Parish
                </h3>
                <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">
                  For parishes with 1,500+ families
                </p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="font-['Georgia'] text-5xl text-[#2d1b4e] dark:text-white">$199</span>
                  <span className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">/month</span>
                </div>
                <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 mt-2">
                  Billed annually or $239/month
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Unlimited records",
                  "Unlimited users",
                  "Advanced analytics & insights",
                  "Premium support",
                  "Mobile access",
                  "API access",
                  "Custom integrations",
                  "Dedicated account manager",
                  "Training sessions",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="text-[#d4af37] flex-shrink-0 mt-0.5" size={20} />
                    <span className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className="block w-full text-center px-6 py-3 bg-white dark:bg-gray-700 border-2 border-[#2d1b4e] dark:border-[#d4af37] text-[#2d1b4e] dark:text-[#d4af37] rounded-lg font-['Inter'] font-medium hover:bg-[#2d1b4e] hover:text-white dark:hover:bg-[#d4af37] dark:hover:text-[#2d1b4e] transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Enterprise */}
          <div className="bg-[#f9fafb] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 rounded-2xl p-12 text-center">
            <h3 className="font-['Georgia'] text-3xl text-[#2d1b4e] dark:text-white mb-4">
              Diocese or Multi-Parish Plans
            </h3>
            <p className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Manage multiple parishes under one account with centralized reporting, 
              shared resources, and volume pricing.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] font-medium hover:bg-[#1f1236] dark:hover:bg-[#c29d2f] transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-[#f9fafb] dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Georgia'] text-4xl text-[#2d1b4e] dark:text-white mb-4">
              Compare Plans
            </h2>
            <p className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400">
              All plans include core features. See what's different.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f3f4f6] dark:border-gray-700">
                    <th className="text-left p-6 font-['Inter'] font-medium text-[16px] text-[#2d1b4e] dark:text-white">
                      Feature
                    </th>
                    <th className="p-6 font-['Inter'] font-medium text-[16px] text-[#2d1b4e] dark:text-white">Small</th>
                    <th className="p-6 font-['Inter'] font-medium text-[16px] text-[#2d1b4e] dark:text-white">Medium</th>
                    <th className="p-6 font-['Inter'] font-medium text-[16px] text-[#2d1b4e] dark:text-white">Large</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Records Limit", small: "2,000", medium: "10,000", large: "Unlimited" },
                    { feature: "User Accounts", small: "2", medium: "5", large: "Unlimited" },
                    { feature: "Storage", small: "5 GB", medium: "25 GB", large: "100 GB" },
                    { feature: "Support", small: "Email", medium: "Priority", large: "Premium" },
                    { feature: "API Access", small: "—", medium: "—", large: "✓" },
                    { feature: "Custom Integrations", small: "—", medium: "—", large: "✓" },
                    { feature: "Training Sessions", small: "—", medium: "—", large: "✓" },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                      <td className="p-6 font-['Inter'] text-[15px] text-[#2d1b4e] dark:text-white">{row.feature}</td>
                      <td className="p-6 font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 text-center">{row.small}</td>
                      <td className="p-6 font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 text-center">{row.medium}</td>
                      <td className="p-6 font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 text-center">{row.large}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Georgia'] text-4xl text-[#2d1b4e] dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                question: "Can I switch plans later?",
                answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
              },
              {
                question: "What happens if I exceed my record limit?",
                answer: "We'll notify you when you're approaching your limit. You can either upgrade your plan or archive older records.",
              },
              {
                question: "Is there a setup fee?",
                answer: "No setup fees. We also offer free onboarding assistance to help you get started with digitizing your records.",
              },
              {
                question: "Do you offer discounts for annual billing?",
                answer: "Yes! Save 15-20% by paying annually instead of monthly.",
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, ACH transfers, and can invoice for annual plans.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-[#f9fafb] dark:bg-gray-800 rounded-xl p-6 border border-[#f3f4f6] dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <HelpCircle className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">
                      {faq.question}
                    </h3>
                    <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            Ready to Get Started?
          </h2>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            Start your free trial today. No credit card required.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
