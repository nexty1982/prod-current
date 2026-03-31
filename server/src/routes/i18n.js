/**
 * GET /api/i18n/:lang[?ns=common,explorer]
 *
 * Returns UI translations for the given language code as a flat key/value map.
 * English is the source/default — it is NOT stored in the DB. When lang=en,
 * the endpoint returns the built-in English defaults. For any other language,
 * DB translations are merged over the English defaults so missing keys
 * automatically fall back to English.
 *
 * Optional `ns` query param filters by namespace (comma-separated).
 *
 * Response shape:
 *   { "explorer.col_type": "Τύπος", "explorer.col_name": "Όνομα", ... }
 *
 * GET /api/i18n
 *   Returns language metadata (default, supported, labels).
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');

// ═══════════════════════════════════════════════════════════════════════
// Canonical English defaults — single source of truth for fallback.
// Keys use dot-namespaced form: {namespace}.{section}.{element}
// ═══════════════════════════════════════════════════════════════════════

const ENGLISH_DEFAULTS = {
  // ─── common.* ─────────────────────────────────────────────────────
  'common.brand_name': 'Orthodox Metrics',
  'common.sign_in': 'Sign In',
  'common.sign_out': 'Sign Out',
  'common.church_login': 'Church Login',
  'common.dark_mode': 'Dark Mode',
  'common.light_mode': 'Light Mode',
  'common.language': 'Language',
  'common.record_baptism': 'Baptism',
  'common.record_marriage': 'Marriage',
  'common.record_funeral': 'Funeral',
  'common.lang_english': 'English',
  'common.lang_greek': 'Greek',
  'common.lang_russian': 'Russian',
  'common.lang_romanian': 'Romanian',
  'common.lang_georgian': 'Georgian',

  // ─── nav.* ──────────────────────────────────────────────────────
  'nav.home': 'Home',
  'nav.about': 'About',
  'nav.tour': 'Tour',
  'nav.samples': 'Samples',
  'nav.pricing': 'Pricing',
  'nav.blog': 'Blog',
  'nav.contact': 'Contact',

  // ─── footer.* ───────────────────────────────────────────────────
  'footer.tagline': 'Preserving sacred records for Orthodox Christian parishes.',
  'footer.heading_product': 'Product',
  'footer.heading_company': 'Company',
  'footer.heading_support': 'Support',
  'footer.platform_tour': 'Platform Tour',
  'footer.sample_records': 'Sample Records',
  'footer.pricing': 'Pricing',
  'footer.about_us': 'About Us',
  'footer.blog': 'Blog',
  'footer.contact': 'Contact',
  'footer.hours': 'Monday – Friday, 9am – 5pm EST',
  'footer.copyright': '© {year} Orthodox Metrics. All rights reserved.',

  // ─── home.* ─────────────────────────────────────────────────────
  // Hero
  'home.hero_badge': 'Trusted by Orthodox Parishes Worldwide',
  'home.hero_title': 'Sacred Records Management for the Modern Parish',
  'home.hero_subtitle': 'Transform centuries of handwritten sacramental records into secure, searchable digital archives. Preserve your spiritual heritage while embracing modern technology.',
  'home.hero_cta_tour': 'Take a Tour',
  'home.hero_cta_demo': 'Request Demo',
  // Intro
  'home.intro_badge': 'What We Do',
  'home.intro_title': 'Digitize. Preserve. Connect.',
  'home.intro_subtitle': 'Orthodox Metrics transforms how parishes manage their most sacred documents',
  'home.intro_card1_title': 'Digital Preservation',
  'home.intro_card1_desc': 'Convert fragile handwritten records from baptisms, marriages, and funerals into permanent digital archives that withstand the test of time.',
  'home.intro_card2_title': 'Instant Access',
  'home.intro_card2_desc': 'Search your entire parish history in seconds. Find records by name, date, location, or any custom field you need.',
  'home.intro_card3_title': 'Bank-Level Security',
  'home.intro_card3_desc': 'Your sacred records are encrypted and protected with enterprise-grade security, ensuring privacy and compliance.',
  // Steps
  'home.steps_badge': 'Simple Process',
  'home.steps_title': 'From Paper to Digital in Three Steps',
  'home.steps_step1_title': 'Digitize Records',
  'home.steps_step1_desc': 'Scan or photograph your existing records. Our team can help with bulk digitization if needed.',
  'home.steps_step2_title': 'Structure Your Data',
  'home.steps_step2_desc': 'Input sacramental details into organized databases with custom fields for your parish needs.',
  'home.steps_step3_title': 'Search & Analyze',
  'home.steps_step3_desc': 'Access records instantly, generate reports, and gain insights into your parish history.',
  // Features
  'home.features_badge': 'Features',
  'home.features_title': 'Built for Orthodox Parishes',
  'home.features_feat1_title': 'Multi-Language Support',
  'home.features_feat1_desc': 'Full support for Greek, Russian, Romanian, Georgian, and English records.',
  'home.features_feat2_title': 'Calendar-Aware',
  'home.features_feat2_desc': 'Supports both Old and New Calendar traditions with liturgical color themes.',
  'home.features_feat3_title': 'Analytics & Reports',
  'home.features_feat3_desc': 'Generate insights about sacramental trends, parish growth, and historical patterns.',
  'home.features_feat4_title': 'Role-Based Access',
  'home.features_feat4_desc': 'Control who can view, edit, or manage different types of records.',
  'home.features_feat5_title': 'All Sacraments',
  'home.features_feat5_desc': 'Baptisms, chrismations, marriages, funerals, and custom record types.',
  'home.features_feat6_title': 'Advanced Search',
  'home.features_feat6_desc': 'Find any record using names, dates, locations, or custom fields.',
  // Records
  'home.records_title': 'All Your Sacred Records, One Platform',
  'home.records_subtitle': 'Manage every type of sacramental record your parish maintains',
  'home.records_type1_name': 'Baptisms',
  'home.records_type1_detail': 'Track godparents, sponsors, priests',
  'home.records_type2_name': 'Marriages',
  'home.records_type2_detail': 'Witnesses, dates, locations',
  'home.records_type3_name': 'Funerals',
  'home.records_type3_detail': 'Memorial services, burial sites',
  'home.records_type4_name': 'Custom Records',
  'home.records_type4_detail': 'Create your own record types',
  // Why
  'home.why_badge': 'Why Orthodox Metrics',
  'home.why_title': 'Designed with Orthodox Tradition in Mind',
  'home.why_desc': 'Unlike generic record management systems, Orthodox Metrics was built specifically for Orthodox Christian parishes, respecting the unique needs of our faith tradition.',
  'home.why_item1': 'Follows OCA guidelines for record keeping',
  'home.why_item2': 'Respects liturgical calendar traditions',
  'home.why_item3': 'Multilingual support for diverse communities',
  'home.why_item4': 'Secure, private, and compliant with regulations',
  'home.why_stat1_number': '500+',
  'home.why_stat1_label': 'Parishes using Orthodox Metrics',
  'home.why_stat2_number': '1M+',
  'home.why_stat2_label': 'Records digitized and preserved',
  'home.why_stat3_number': '15+',
  'home.why_stat3_label': 'Countries worldwide',
  // CTA
  'home.cta_title': 'Ready to Preserve Your Parish History?',
  'home.cta_subtitle': 'Join hundreds of Orthodox parishes already protecting their sacred records',
  'home.cta_get_started': 'Get Started Today',
  'home.cta_view_pricing': 'View Pricing',

  // ─── about.* ────────────────────────────────────────────────────
  // Hero
  'about.hero_badge': 'Our Story',
  'about.hero_title': 'Preserving Orthodox Heritage Through Technology',
  'about.hero_subtitle': 'Orthodox Metrics was founded to solve a critical challenge: protecting centuries of sacred parish records while making them accessible for future generations.',
  // Purpose
  'about.purpose_badge': 'Our Purpose',
  'about.purpose_title': 'Safeguarding Sacred Records for Future Generations',
  'about.purpose_p1': 'Many Orthodox parishes still rely on fragile, handwritten records that are vulnerable to loss, damage, and the passage of time. These sacred documents contain centuries of spiritual heritage.',
  'about.purpose_p2': 'Orthodox Metrics helps parishes digitize, preserve, and securely manage these records while maintaining the reverence and tradition they deserve.',
  'about.purpose_p3': 'Our platform brings modern technology to sacred recordkeeping, ensuring that future generations can access and honor the spiritual milestones of their communities.',
  'about.purpose_card1_title': 'Preserve History',
  'about.purpose_card1_desc': 'Transform fragile paper records into secure digital archives that will last for generations.',
  'about.purpose_card2_title': 'Easy Access',
  'about.purpose_card2_desc': 'Search and retrieve records instantly, making parish administration more efficient.',
  'about.purpose_card3_title': 'Secure Storage',
  'about.purpose_card3_desc': 'Bank-level encryption ensures your sacred records remain private and protected.',
  // Highlights
  'about.highlights_badge': 'Platform Highlights',
  'about.highlights_title': 'Built with Your Parish in Mind',
  'about.highlights_subtitle': 'Every feature is designed to honor Orthodox tradition while providing modern convenience and security.',
  'about.highlight1_title': 'Built for Orthodox Churches',
  'about.highlight1_desc': 'Platform follows guidelines established by the Orthodox Church in America, respecting tradition while embracing modern tools.',
  'about.highlight2_title': 'Multi-Language Support',
  'about.highlight2_desc': 'Full support for Greek, Russian, Romanian, Georgian, and English, ensuring accessibility for diverse Orthodox communities.',
  'about.highlight3_title': 'Secure Record Management',
  'about.highlight3_desc': 'Digitized sacramental records are encrypted and stored with enterprise-grade security, protecting sensitive parish data.',
  'about.highlight4_title': 'Calendar-Aware Scheduling',
  'about.highlight4_desc': 'Supports both Old and New Calendar traditions with 8 liturgical color themes that follow the church calendar.',
  // Team
  'about.team_badge': 'Our Team',
  'about.team_title': 'Led by Orthodox Christians',
  'about.team_subtitle': 'Our team understands the unique needs of Orthodox parishes because we are part of the community',
  'about.team1_name': 'Fr. Nicholas Parsells',
  'about.team1_role': 'Founder & Spiritual Advisor',
  'about.team1_desc': '30 years serving Orthodox parishes, passionate about preserving our spiritual heritage.',
  'about.team2_name': 'Maria Konstantinou',
  'about.team2_role': 'Head of Product',
  'about.team2_desc': 'Former parish secretary with deep understanding of church record management.',
  'about.team3_name': 'Dr. Alexander Petrov',
  'about.team3_role': 'Chief Technology Officer',
  'about.team3_desc': 'Expert in database systems and digital preservation technologies.',
  // Values
  'about.values_title': 'Our Values',
  'about.value1_title': 'Reverence',
  'about.value1_desc': 'We approach sacred records with the respect and care they deserve, honoring centuries of Orthodox tradition.',
  'about.value2_title': 'Trust',
  'about.value2_desc': 'Your parish data is precious. We protect it with the highest security standards and complete transparency.',
  'about.value3_title': 'Excellence',
  'about.value3_desc': 'We\'re committed to building the best possible platform for Orthodox parishes, constantly improving and innovating.',
  // CTA
  'about.cta_title': 'Join Us in Preserving Orthodox Heritage',
  'about.cta_subtitle': 'Help us protect your parish\'s sacred records for future generations',
  'about.cta_button': 'Get in Touch',

  // ─── tour.* ─────────────────────────────────────────────────────
  // Hero
  'tour.hero_badge': 'Platform Tour',
  'tour.hero_title': 'See How Orthodox Metrics Works',
  'tour.hero_subtitle': 'A step-by-step walkthrough of how we help parishes digitize and manage their sacred records',
  // Step 1
  'tour.step1_badge': 'Step 1',
  'tour.step1_title': 'Digitizing Your Records',
  'tour.step1_desc': 'Begin by capturing images of your existing paper records. Our platform accepts scans and photographs from any device — smartphone, tablet, or scanner.',
  'tour.step1_bullet1': 'Upload individual records or batch import hundreds at once',
  'tour.step1_bullet2': 'Automatic image enhancement for old or faded documents',
  'tour.step1_bullet3': 'OCR technology extracts text from handwritten records',
  'tour.step1_bullet4': 'Professional digitization services available for large volumes',
  'tour.step1_mock_dropzone': 'Drag & drop your documents or click to browse',
  // Step 2
  'tour.step2_badge': 'Step 2',
  'tour.step2_title': 'Organizing Parish Data',
  'tour.step2_desc': 'Transform images into structured, searchable records. Enter sacramental details into organized databases designed specifically for Orthodox parishes.',
  'tour.step2_bullet1': 'Pre-built templates for baptisms, marriages, and funerals',
  'tour.step2_bullet2': 'Custom fields for unique parish needs',
  'tour.step2_bullet3': 'Link related records (families, sponsors, witnesses)',
  'tour.step2_bullet4': 'Multi-language data entry with transliteration support',
  'tour.step2_mock_name': 'Name',
  'tour.step2_mock_date': 'Date',
  'tour.step2_mock_type': 'Type',
  'tour.step2_mock_priest': 'Priest',
  // Step 3
  'tour.step3_badge': 'Step 3',
  'tour.step3_title': 'Powerful Search Capabilities',
  'tour.step3_desc': 'Find any record in seconds using our advanced search tools. Search by name, date, location, priest, or any custom field you\'ve created.',
  'tour.step3_bullet1': 'Full-text search across all records and fields',
  'tour.step3_bullet2': 'Filter by date ranges, sacrament types, and locations',
  'tour.step3_bullet3': 'Fuzzy matching handles spelling variations',
  'tour.step3_bullet4': 'Search in multiple languages simultaneously',
  'tour.step3_bullet5': 'Save frequent searches for quick access',
  // Step 4
  'tour.step4_badge': 'Step 4',
  'tour.step4_title': 'Reporting & Analytics',
  'tour.step4_desc': 'Gain valuable insights into your parish history. Generate reports, visualize trends, and understand patterns across decades of sacramental records.',
  'tour.step4_bullet1': 'Track baptisms, marriages, and funerals over time',
  'tour.step4_bullet2': 'Visualize parish growth and demographic trends',
  'tour.step4_bullet3': 'Generate reports for diocese submissions',
  'tour.step4_bullet4': 'Export data for custom analysis',
  'tour.step4_bullet5': 'Compare statistics across time periods',
  'tour.step4_mock_total_baptisms': 'Total Baptisms',
  'tour.step4_mock_this_year': 'This Year',
  // Additional Features
  'tour.extras_title': 'More Ways We Support Your Parish',
  'tour.extra1_title': 'Secure Storage',
  'tour.extra1_desc': 'Bank-level encryption and multiple backups ensure your records are always safe and accessible.',
  'tour.extra2_title': 'Role-Based Access',
  'tour.extra2_desc': 'Control who can view, edit, or manage records with customizable permission levels.',
  'tour.extra3_title': 'Document Generation',
  'tour.extra3_desc': 'Create certificates, letters of good standing, and official documents automatically.',
  'tour.extra4_title': 'Calendar Integration',
  'tour.extra4_desc': 'Link records to liturgical calendars with support for Old and New Calendar traditions.',
  // CTA
  'tour.cta_title': 'Ready to See It in Action?',
  'tour.cta_subtitle': 'Schedule a personalized demo to see how Orthodox Metrics can transform your parish record keeping',
  'tour.cta_button': 'Request a Demo',

  // ─── contact.* ────────────────────────────────────────────────────
  // Hero
  'contact.hero_badge': 'Get in Touch',
  'contact.hero_title': 'We\'re Here to Help',
  'contact.hero_subtitle': 'Have questions about Orthodox Metrics? Our team is ready to assist your parish',
  // Form
  'contact.form_title': 'Send Us a Message',
  'contact.form_desc': 'Fill out the form below and we\'ll get back to you within 24 hours.',
  'contact.label_name': 'Your Name *',
  'contact.label_email': 'Email Address *',
  'contact.label_parish': 'Parish Name',
  'contact.label_phone': 'Phone Number',
  'contact.label_topic': 'What can we help you with? *',
  'contact.label_message': 'Message *',
  'contact.placeholder_name': 'Fr. John Smith',
  'contact.placeholder_email': 'email@parish.org',
  'contact.placeholder_parish': 'St. Nicholas Orthodox Church',
  'contact.placeholder_phone': '(555) 123-4567',
  'contact.placeholder_message': 'Tell us about your parish and how we can help...',
  'contact.option_demo': 'Request a Demo',
  'contact.option_general': 'General Inquiry',
  'contact.option_billing': 'Pricing Information',
  'contact.option_technical': 'Technical Support',
  'contact.option_other': 'Other',
  'contact.btn_send': 'Send Message',
  'contact.btn_sending': 'Sending...',
  // Success / Error
  'contact.success_title': 'Message Sent!',
  'contact.success_desc': 'We\'ll be in touch within 24 hours.',
  'contact.error_message': 'Something went wrong. Please try again.',
  // Contact Info
  'contact.info_title': 'Contact Information',
  'contact.info_desc': 'Prefer to reach out directly? Here\'s how to get in touch with our team.',
  'contact.info1_title': 'Email Us',
  'contact.info1_detail': 'support@orthodoxmetrics.com',
  'contact.info1_subtext': 'We respond within 24 hours',
  'contact.info2_title': 'Call Us',
  'contact.info2_detail': '(555) 123-4567',
  'contact.info2_subtext': 'Monday – Friday, 9am – 5pm EST',
  'contact.info3_title': 'Mailing Address',
  'contact.info3_detail': '123 Church Street, Suite 100',
  'contact.info3_subtext': 'Boston, MA 02118',
  'contact.info4_title': 'Business Hours',
  'contact.info4_detail': 'Monday – Friday: 9:00 AM – 5:00 PM EST',
  'contact.info4_subtext': 'Closed on major Orthodox feast days',
  // Demo CTA
  'contact.demo_title': 'Schedule a Demo',
  'contact.demo_desc': 'See Orthodox Metrics in action with a personalized walkthrough for your parish.',
  'contact.demo_button': 'Book a Demo Call',
  // FAQ
  'contact.faq_title': 'Common Questions',
  'contact.faq_subtitle': 'Quick answers to questions you may have',
  'contact.faq1_q': 'How long does it take to get started?',
  'contact.faq1_a': 'Most parishes are up and running within 1–2 weeks. We provide onboarding support to help you through the initial setup.',
  'contact.faq2_q': 'Do you offer help with digitizing existing records?',
  'contact.faq2_a': 'Yes! We can connect you with professional digitization services or guide your team through the process.',
  'contact.faq3_q': 'Is my data secure?',
  'contact.faq3_a': 'Absolutely. We use bank-level encryption, regular backups, and comply with all data protection regulations.',
  'contact.faq4_q': 'Can I try before I buy?',
  'contact.faq4_a': 'Yes, we offer a 30-day free trial with full access to all features.',

  // ─── faq.* ─────────────────────────────────────────────────────────
  // Page banner
  'faq.page_title': 'Frequently Asked Questions',
  'faq.page_subtitle': 'Find answers to common questions about Orthodox Metrics',
  // Accordion title
  'faq.accordion_title': 'Frequently Asked Questions',
  // Q&A pairs
  'faq.q1': 'What is included with my purchase?',
  'faq.a1': 'An initial consult for a discussion about your church and how we can best assist you.',
  'faq.q2': 'One time purchase',
  'faq.a2': 'One time purchase for continual use as your church grows.',
  'faq.q3': 'How does the Orthodox Metrics calendar work?',
  'faq.a3': 'The calendar serves as a reference for both Old and New Calendar liturgical timelines',
  'faq.q4': 'What is the timeframe to have the church records complete?',
  'faq.a4': 'We will work with you, in general the timeframe is relative to the amount of records and how much you need us to do.',
  'faq.q5': 'What if I need to print a baptismal or marriage certificate, can I do that?',
  'faq.a5': 'Of course. Certificates are dynamically generated and use the template that is provided by your head of church.',
  'faq.q6': 'How can I get support?',
  'faq.a6': 'Email is ideal, but we can schedule a call if you prefer talking.',
  // Help section
  'faq.still_question': 'Still have a question?',
  'faq.email_us': 'Email us',
  'faq.or': 'or',
  'faq.submit_ticket': 'submit a ticket',

  // ─── cta.* ─────────────────────────────────────────────────────────
  'cta.heading1': 'Start today with your',
  'cta.heading1_highlight': 'parish',
  'cta.heading2': 'We\'ll handle the',
  'cta.heading2_highlight': 'records',
  'cta.subtitle': 'Become an early adopter and assist in building an Orthodox Church Metrics platform!',
  'cta.btn_register': 'Register Your Church',
  'cta.btn_info': 'Request Information',

  // ─── pricing.* ──────────────────────────────────────────────────────
  // Hero
  'pricing.hero_badge': 'Simple, Transparent Pricing',
  'pricing.hero_title': 'Plans for Parishes of All Sizes',
  'pricing.hero_subtitle': 'Choose the plan that fits your parish. All plans include core features, security, and support.',
  // Plan names & descriptions
  'pricing.plan_small_name': 'Small Parish',
  'pricing.plan_small_desc': 'Perfect for parishes with up to 500 families',
  'pricing.plan_medium_name': 'Medium Parish',
  'pricing.plan_medium_desc': 'Ideal for parishes with 500–1,500 families',
  'pricing.plan_large_name': 'Large Parish',
  'pricing.plan_large_desc': 'For parishes with 1,500+ families',
  // Prices & billing
  'pricing.plan_small_price': '$49',
  'pricing.plan_small_billing': 'Billed annually or $59/month',
  'pricing.plan_medium_price': '$99',
  'pricing.plan_medium_billing': 'Billed annually or $119/month',
  'pricing.plan_large_price': '$199',
  'pricing.plan_large_billing': 'Billed annually or $239/month',
  'pricing.per_month': '/month',
  // Badges & buttons
  'pricing.badge_popular': 'Most Popular',
  'pricing.btn_get_started': 'Get Started',
  'pricing.btn_contact_sales': 'Contact Sales',
  'pricing.btn_start_trial': 'Start Free Trial',
  // Small Parish features
  'pricing.plan_small_feat1': 'Up to 2,000 records',
  'pricing.plan_small_feat2': '2 user accounts',
  'pricing.plan_small_feat3': 'Basic search & filters',
  'pricing.plan_small_feat4': 'Standard support',
  'pricing.plan_small_feat5': 'Mobile access',
  'pricing.plan_small_feat6': 'Data export',
  // Medium Parish features
  'pricing.plan_medium_feat1': 'Up to 10,000 records',
  'pricing.plan_medium_feat2': '5 user accounts',
  'pricing.plan_medium_feat3': 'Advanced search & analytics',
  'pricing.plan_medium_feat4': 'Priority support',
  'pricing.plan_medium_feat5': 'Mobile access',
  'pricing.plan_medium_feat6': 'Data export & import',
  'pricing.plan_medium_feat7': 'Custom fields',
  'pricing.plan_medium_feat8': 'Report generation',
  // Large Parish features
  'pricing.plan_large_feat1': 'Unlimited records',
  'pricing.plan_large_feat2': 'Unlimited users',
  'pricing.plan_large_feat3': 'Advanced analytics & insights',
  'pricing.plan_large_feat4': 'Premium support',
  'pricing.plan_large_feat5': 'Mobile access',
  'pricing.plan_large_feat6': 'API access',
  'pricing.plan_large_feat7': 'Custom integrations',
  'pricing.plan_large_feat8': 'Dedicated account manager',
  'pricing.plan_large_feat9': 'Training sessions',
  // Enterprise
  'pricing.enterprise_title': 'Diocese or Multi-Parish Plans',
  'pricing.enterprise_desc': 'Manage multiple parishes under one account with centralized reporting, shared resources, and volume pricing.',
  // Comparison table
  'pricing.compare_title': 'Compare Plans',
  'pricing.compare_subtitle': 'All plans include core features. See what\'s different.',
  'pricing.compare_header_feature': 'Feature',
  'pricing.compare_header_small': 'Small',
  'pricing.compare_header_medium': 'Medium',
  'pricing.compare_header_large': 'Large',
  'pricing.compare_row1_feature': 'Records Limit',
  'pricing.compare_row1_small': '2,000',
  'pricing.compare_row1_medium': '10,000',
  'pricing.compare_row1_large': 'Unlimited',
  'pricing.compare_row2_feature': 'User Accounts',
  'pricing.compare_row2_small': '2',
  'pricing.compare_row2_medium': '5',
  'pricing.compare_row2_large': 'Unlimited',
  'pricing.compare_row3_feature': 'Storage',
  'pricing.compare_row3_small': '5 GB',
  'pricing.compare_row3_medium': '25 GB',
  'pricing.compare_row3_large': '100 GB',
  'pricing.compare_row4_feature': 'Support',
  'pricing.compare_row4_small': 'Email',
  'pricing.compare_row4_medium': 'Priority',
  'pricing.compare_row4_large': 'Premium',
  'pricing.compare_row5_feature': 'API Access',
  'pricing.compare_row6_feature': 'Custom Integrations',
  'pricing.compare_row7_feature': 'Training Sessions',
  // FAQ
  'pricing.faq_title': 'Frequently Asked Questions',
  'pricing.faq1_q': 'Can I switch plans later?',
  'pricing.faq1_a': 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.',
  'pricing.faq2_q': 'What happens if I exceed my record limit?',
  'pricing.faq2_a': 'We\'ll notify you when you\'re approaching your limit. You can either upgrade your plan or archive older records.',
  'pricing.faq3_q': 'Is there a setup fee?',
  'pricing.faq3_a': 'No setup fees. We also offer free onboarding assistance to help you get started with digitizing your records.',
  'pricing.faq4_q': 'Do you offer discounts for annual billing?',
  'pricing.faq4_a': 'Yes! Save 15–20% by paying annually instead of monthly.',
  'pricing.faq5_q': 'What payment methods do you accept?',
  'pricing.faq5_a': 'We accept all major credit cards, ACH transfers, and can invoice for annual plans.',
  // CTA
  'pricing.cta_title': 'Ready to Get Started?',
  'pricing.cta_subtitle': 'Start your free trial today. No credit card required.',

  // ─── samples.* ──────────────────────────────────────────────────────
  // Hero
  'samples.hero_badge': 'Sample Records',
  'samples.hero_title': 'See Real Parish Records',
  'samples.hero_subtitle': 'Explore authentic examples of how Orthodox parishes digitize and preserve their sacramental records',
  // Introduction
  'samples.intro_text': 'The following samples demonstrate real-world use cases of Orthodox Metrics. All personally identifying information has been anonymized while preserving the structure and detail that makes our system effective.',
  'samples.compliance_badge': '✓ HIPAA Compliant  •  ✓ GDPR Compliant  •  ✓ Secure by Design',
  // Baptism section
  'samples.baptism_badge': 'Baptism Record',
  'samples.baptism_title': 'Sacrament of Baptism',
  'samples.baptism_desc': 'A complete baptismal record showing all key participants, dates, and locations. This template follows traditional Orthodox record-keeping practices while providing modern searchability.',
  'samples.baptism_cert_title': 'Certificate of Baptism',
  'samples.baptism_cert_record_no': 'Record No.',
  'samples.baptism_cert_entered': 'Entered',
  'samples.baptism_label_child_name': 'Child\'s Name',
  'samples.baptism_label_dob': 'Date of Birth',
  'samples.baptism_label_date_baptism': 'Date of Baptism',
  'samples.baptism_label_parents': 'Parents',
  'samples.baptism_label_godparents': 'Godparents',
  'samples.baptism_label_celebrant': 'Celebrant',
  // Baptism digital section
  'samples.baptism_digital_badge': 'Digitized Format',
  'samples.baptism_digital_title': 'Structured & Searchable',
  'samples.baptism_digital_desc': 'The same information transformed into a searchable database format with advanced filtering and reporting capabilities.',
  'samples.baptism_card1_title': 'Primary Information',
  'samples.baptism_card2_title': 'Family & Sponsors',
  'samples.baptism_card3_title': 'Location & Clergy',
  'samples.baptism_digital_full_name': 'Full Name',
  'samples.baptism_digital_birth_date': 'Birth Date',
  'samples.baptism_digital_baptism_date': 'Baptism Date',
  'samples.baptism_digital_parents': 'Parents',
  'samples.baptism_digital_godparents': 'Godparents',
  'samples.baptism_digital_parish': 'Parish',
  'samples.baptism_digital_city': 'City',
  'samples.baptism_digital_celebrant': 'Celebrant',
  'samples.badge_searchable': 'Searchable',
  // Marriage section
  'samples.marriage_badge': 'Marriage Record',
  'samples.marriage_title': 'Sacrament of Holy Matrimony',
  'samples.marriage_subtitle': 'Marriage records include bride, groom, witnesses, and canonical requirements',
  'samples.marriage_traditional': 'Traditional Record',
  'samples.marriage_searchable': 'Searchable Database',
  'samples.marriage_label_groom': 'Groom',
  'samples.marriage_label_bride': 'Bride',
  'samples.marriage_label_date': 'Date',
  'samples.marriage_label_witnesses': 'Witnesses',
  'samples.marriage_label_officiant': 'Officiant',
  'samples.marriage_search_groom': 'Search by Groom',
  'samples.marriage_search_bride': 'Search by Bride',
  'samples.marriage_search_date': 'Search by Date Range',
  'samples.marriage_search_priest': 'Search by Priest',
  'samples.badge_indexed': 'Indexed',
  // Multi-language section
  'samples.multilang_badge': 'Multi-Language Support',
  'samples.multilang_title': 'Records in Any Language',
  'samples.multilang_subtitle': 'Orthodox Metrics supports Greek, Russian, Arabic, Georgian, Romanian, and more',
  // Search demo section
  'samples.search_badge': 'Advanced Search',
  'samples.search_title': 'Find Records Instantly',
  'samples.search_subtitle': 'Search across all fields, filter by date ranges, and generate custom reports',
  'samples.search_label': 'Search Records',
  'samples.search_placeholder': 'Search by name, date, location, priest...',
  'samples.search_type_label': 'Record Type',
  'samples.search_type_all': 'All Types',
  'samples.search_type_baptisms': 'Baptisms',
  'samples.search_type_marriages': 'Marriages',
  'samples.search_type_funerals': 'Funerals',
  'samples.search_date_from': 'Date From',
  'samples.search_date_to': 'Date To',
  'samples.search_btn': 'Search Records',
  'samples.search_btn_advanced': 'Advanced Filters',
  'samples.search_showing': 'Showing {count} results',
  // Explorer CTA
  'samples.explorer_badge': 'Interactive Explorer',
  'samples.explorer_title': 'Browse All Sample Records',
  'samples.explorer_subtitle': 'Explore hundreds of sample records across 5 languages with AG Grid table, cards, timeline, and analytics views',
  'samples.explorer_btn': 'Open Records Explorer',
  // Bottom CTA
  'samples.cta_title': 'Ready to Digitize Your Records?',
  'samples.cta_subtitle': 'See how Orthodox Metrics can preserve your parish history',
  'samples.cta_btn_demo': 'Request a Demo',
  'samples.cta_btn_pricing': 'View Pricing',

  // ─── portfolio.* ──────────────────────────────────────────────────
  'portfolio.badge': 'Portfolio',
  'portfolio.title': 'Explore Our Latest Works',

  // ─── auth.* ────────────────────────────────────────────────────────
  // Login page hero
  'auth.hero_badge': 'Orthodox Christian Record Translation + Management',
  'auth.hero_title_prefix': 'Welcome to',
  'auth.hero_title_brand': 'Orthodox Metrics',
  'auth.hero_subtitle': 'Digitize, preserve, and manage your parish records with reverence and precision. Supporting the canonical traditions of the Orthodox Church worldwide.',
  // Feature bullets
  'auth.feat1_title': 'Digital Records Management',
  'auth.feat1_desc': 'Comprehensive digitization of baptisms, marriages, funerals, and other sacred records.',
  'auth.feat2_title': 'Multilingual OCR Recognition',
  'auth.feat2_desc': 'Advanced text recognition for Greek, Russian, Romanian, and English documents.',
  'auth.feat3_title': 'Multi-Language Support',
  'auth.feat3_desc': 'Full support for Greek, Russian, Romanian, Georgian, and English interfaces.',
  'auth.feat4_title': 'Secure Cloud Storage',
  'auth.feat4_desc': 'Enterprise-grade security for your most precious parish documents.',
  // Login card
  'auth.card_heading': 'Sign In',
  'auth.card_subheading': 'Access your parish dashboard',
  'auth.new_to_om': 'New to Orthodox Metrics?',
  'auth.create_account': 'Create an account',
  // Form fields
  'auth.label_email': 'Email or Username',
  'auth.label_password': 'Password',
  'auth.remember_device': 'Remember this Device',
  'auth.forgot_password': 'Forgot Password?',
  'auth.btn_sign_in': 'Sign In',
  'auth.btn_signing_in': 'Signing In...',
  // Validation
  'auth.error_username_required': 'Email or username is required',
  'auth.error_password_required': 'Password is required',
  // Error help text
  'auth.error_still_trouble': 'Still having trouble?',
  'auth.error_contact_support': 'Contact support',
  'auth.error_or_refresh': 'or try refreshing the page.',
  'auth.error_forgot_password': 'Forgot your password?',
  'auth.error_reset_here': 'Reset it here',
  'auth.error_check_status_prefix': 'Please check our',
  'auth.error_status_page': 'system status page',
  'auth.error_check_status_suffix': 'for updates.',

  // ─── blog.* ─────────────────────────────────────────────────────────
  // Hero
  'blog.hero_badge': 'Our Blog',
  'blog.hero_title': 'Insights & Updates',
  'blog.hero_subtitle': 'Stories, guides, and news about preserving Orthodox heritage through technology',
  // Featured article
  'blog.featured_badge': 'Featured Article',
  'blog.featured_title': 'Why Every Orthodox Parish Needs Digital Records',
  'blog.featured_desc': 'Paper records are fragile. Fire, flooding, humidity, and simple aging can destroy centuries of parish history in moments. In this article, we explore why digitizing your sacramental records isn\'t just convenient — it\'s essential for preservation.',
  'blog.featured_point1': 'Protection against physical damage',
  'blog.featured_point2': 'Instant search across all records',
  'blog.featured_point3': 'Secure backup and redundancy',
  'blog.featured_point4': 'Multi-language accessibility',
  'blog.featured_btn': 'Take the Tour',
  // Recent articles
  'blog.recent_title': 'Recent Articles',
  'blog.recent_subtitle': 'Guides, case studies, and updates from the Orthodox Metrics team',
  'blog.content_english_only': 'Article content is currently available in English.',
  // Category badge labels
  'blog.cat_guide': 'Guide',
  'blog.cat_case_study': 'Case Study',
  'blog.cat_technology': 'Technology',
  'blog.cat_features': 'Features',
  'blog.cat_security': 'Security',
  'blog.cat_updates': 'Updates',
  // Browse by topic
  'blog.topics_title': 'Browse by Topic',
  'blog.topic1_title': 'Guides',
  'blog.topic1_desc': 'Step-by-step tutorials for digitization and platform usage.',
  'blog.topic2_title': 'Case Studies',
  'blog.topic2_desc': 'Real stories from parishes using Orthodox Metrics.',
  'blog.topic3_title': 'Technology',
  'blog.topic3_desc': 'Deep dives into OCR, search, and data preservation.',
  'blog.topic4_title': 'Community',
  'blog.topic4_desc': 'News and updates from the Orthodox Metrics team.',
  // Newsletter
  'blog.newsletter_title': 'Stay Updated',
  'blog.newsletter_desc': 'Subscribe to our newsletter for the latest articles, feature updates, and tips for managing your parish records.',
  'blog.newsletter_placeholder': 'Enter your email',
  'blog.newsletter_btn': 'Subscribe',
  'blog.newsletter_privacy': 'We respect your privacy. Unsubscribe at any time.',
  // CTA
  'blog.cta_title': 'Ready to Preserve Your Parish History?',
  'blog.cta_subtitle': 'Join parishes across the country in digitizing and protecting their sacred records',
  'blog.cta_btn_start': 'Get Started',
  'blog.cta_btn_samples': 'View Samples',

  // ─── restrictions.* ─────────────────────────────────────────────────
  // Page wrapper
  'restrictions.page_title': 'Sacramental Date Restrictions',
  'restrictions.page_subtitle': 'Reference for Eastern Orthodox sacramental date restrictions — periods when baptisms, marriages, and funerals are restricted or require special consideration.',
  // Reference table chrome
  'restrictions.ref_title': 'Restriction Reference',
  'restrictions.ref_subtitle': 'Dates when specific sacraments are restricted per Eastern Orthodox canon.',
  'restrictions.baptism_heading': 'Baptism Restrictions',
  'restrictions.marriage_heading': 'Marriage Restrictions',
  'restrictions.funeral_heading': 'Funeral Restrictions',
  'restrictions.col_period': 'Period / Feast',
  'restrictions.col_dates': 'Dates',
  'restrictions.col_type': 'Type',
  'restrictions.col_check': 'Check',
  'restrictions.col_severity': 'Severity',
  'restrictions.col_note': 'Note',
  'restrictions.chip_error': 'Error',
  'restrictions.chip_warning': 'Warning',
  'restrictions.chip_fixed': 'Fixed',
  'restrictions.chip_moveable': 'Moveable',
  // Baptism periods
  'restrictions.bap_period_1': 'Christmas–Theophany',
  'restrictions.bap_period_2': 'Presentation of Christ',
  'restrictions.bap_period_3': 'Annunciation',
  'restrictions.bap_period_4': 'Dormition Fast',
  'restrictions.bap_period_5': 'Transfiguration',
  'restrictions.bap_period_6': 'Elevation of the Cross',
  'restrictions.bap_period_7': 'Palm Sunday',
  'restrictions.bap_period_8': 'Holy Week',
  'restrictions.bap_period_9': 'Pascha (Easter)',
  'restrictions.bap_period_10': 'Ascension',
  'restrictions.bap_period_11': 'Pentecost',
  // Marriage periods
  'restrictions.mar_period_1': 'Great Lent',
  'restrictions.mar_period_2': 'Bright Week',
  'restrictions.mar_period_3': 'Pentecost',
  'restrictions.mar_period_4': 'Apostles\' Fast',
  'restrictions.mar_period_5': 'Dormition Fast',
  'restrictions.mar_period_6': 'Nativity Fast',
  'restrictions.mar_period_7': 'Christmas–Theophany',
  'restrictions.mar_period_8': 'Beheading of St. John',
  'restrictions.mar_period_9': 'Elevation of the Cross',
  'restrictions.mar_period_10': 'Presentation of Christ',
  'restrictions.mar_period_11': 'Annunciation',
  'restrictions.mar_period_12': 'Transfiguration',
  // Funeral periods
  'restrictions.fun_period_1': 'Burial before death date',
  'restrictions.fun_period_2': 'Great and Holy Friday',
  'restrictions.fun_period_3': 'Great and Holy Saturday',
  'restrictions.fun_period_4': 'Burial on Pascha',
  'restrictions.fun_period_5': 'Bright Week',
  'restrictions.fun_period_6': 'Pentecost',
  'restrictions.fun_period_7': 'Nativity of Christ',
  'restrictions.fun_period_8': 'Theophany',
  'restrictions.fun_period_9': 'Annunciation',
  'restrictions.fun_period_10': 'Transfiguration',
  'restrictions.fun_period_11': 'Dormition of the Theotokos',
  'restrictions.fun_period_12': 'Nativity of the Theotokos',
  'restrictions.fun_period_13': 'Elevation of the Cross',
  // Funeral notes
  'restrictions.fun_note_1': 'Hard block',
  'restrictions.fun_note_2': 'No funeral services held',
  'restrictions.fun_note_3': 'No funeral services held',
  'restrictions.fun_note_4': 'Paschal funeral rite required',
  'restrictions.fun_note_5': 'Modified Paschal rite',
  'restrictions.fun_note_6': 'Generally avoided',
  'restrictions.fun_note_7': 'Generally avoided',
  'restrictions.fun_note_8': 'Generally avoided',
  'restrictions.fun_note_9': 'Generally avoided',
  'restrictions.fun_note_10': 'Generally avoided',
  'restrictions.fun_note_11': 'Generally avoided',
  'restrictions.fun_note_12': 'Generally avoided',
  'restrictions.fun_note_13': 'Generally avoided',
  // Calendar
  'restrictions.month_1': 'January',
  'restrictions.month_2': 'February',
  'restrictions.month_3': 'March',
  'restrictions.month_4': 'April',
  'restrictions.month_5': 'May',
  'restrictions.month_6': 'June',
  'restrictions.month_7': 'July',
  'restrictions.month_8': 'August',
  'restrictions.month_9': 'September',
  'restrictions.month_10': 'October',
  'restrictions.month_11': 'November',
  'restrictions.month_12': 'December',
  'restrictions.dow_su': 'Su',
  'restrictions.dow_mo': 'Mo',
  'restrictions.dow_tu': 'Tu',
  'restrictions.dow_we': 'We',
  'restrictions.dow_th': 'Th',
  'restrictions.dow_fr': 'Fr',
  'restrictions.dow_sa': 'Sa',
  'restrictions.pascha_label': 'Pascha:',
  'restrictions.legend_both': 'Baptism + Marriage blocked',
  'restrictions.legend_baptism': 'Baptism blocked',
  'restrictions.legend_marriage': 'Marriage blocked',
  'restrictions.legend_funeral': 'Funeral blocked',
  'restrictions.legend_funeral_warn': 'Funeral warning',

  // ─── explorer.* ───────────────────────────────────────────────────
  // Column headers
  'explorer.col_type': 'Type',
  'explorer.col_name': 'Name',
  'explorer.col_date': 'Date',
  'explorer.col_location': 'Location',
  'explorer.col_clergy': 'Clergy',
  'explorer.col_details': 'Details',
  'explorer.col_parents': 'Parents',
  // Analytics
  'explorer.analytics_total_records': 'Total Records',
  'explorer.analytics_by_record_type': 'By Record Type',
  'explorer.analytics_by_language': 'By Language',
  'explorer.analytics_records_by_decade': 'Records by Decade',
  'explorer.analytics_top_clergy': 'Top Clergy',
  // UI labels
  'explorer.records_label': 'records',
  'explorer.page_label': 'Page',
  'explorer.back_to_samples': 'Back to Samples',
  'explorer.search_placeholder': 'Search records...',
  'explorer.all_languages': 'All Languages',
  'explorer.all_types': 'All Types',
  'explorer.view_table': 'Table',
  'explorer.view_cards': 'Cards',
  'explorer.view_timeline': 'Timeline',
  'explorer.view_analytics': 'Analytics',
  'explorer.more_label': 'more',
  'explorer.no_records': 'No records found',
  // Hero section
  'explorer.hero_badge': 'Data Explorer',
  'explorer.hero_title': 'Sample Records Explorer',
  'explorer.hero_subtitle': 'Browse all sample sacramental records across languages with interactive table, card, timeline, and analytics views',
  // AG Grid pagination
  'explorer.grid_page': 'Page',
  'explorer.grid_of': 'of',
  'explorer.grid_to': 'to',
  'explorer.grid_first_page': 'First Page',
  'explorer.grid_previous_page': 'Previous Page',
  'explorer.grid_next_page': 'Next Page',
  'explorer.grid_last_page': 'Last Page',
  'explorer.grid_page_size': 'Page Size:',
  'explorer.grid_no_rows': 'No Rows To Show',
  'explorer.grid_filter_placeholder': 'Filter...',
};

// Supported non-English language codes
const SUPPORTED_LANGS = new Set(['el', 'ru', 'ro', 'ka']);

// In-memory cache: { cacheKey: { translations, cachedAt } }
// cacheKey = lang or lang:ns1,ns2 (sorted)
const cache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse optional `ns` query param into a sorted array of namespaces, or null.
 */
function parseNamespaces(nsParam) {
  if (!nsParam || typeof nsParam !== 'string') return null;
  const namespaces = nsParam.split(',').map(s => s.trim()).filter(Boolean);
  return namespaces.length > 0 ? namespaces.sort() : null;
}

/**
 * Filter an object to only keys whose namespace prefix is in the allowed list.
 * Key format: "namespace.rest" — namespace is everything before the first dot.
 */
function filterByNamespace(obj, namespaces) {
  if (!namespaces) return obj;
  const filtered = {};
  for (const [key, value] of Object.entries(obj)) {
    const ns = key.split('.')[0];
    if (namespaces.includes(ns)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// GET /api/i18n/:lang[?ns=common,explorer]
// Now reads from translations_source + translations_localized (new tables),
// with ENGLISH_DEFAULTS as in-memory fallback for resilience.
router.get('/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const namespaces = parseNamespaces(req.query.ns);

    // Build cache key
    const cacheKey = namespaces ? `${lang}:${namespaces.join(',')}` : lang;

    // Check cache
    const cached = cache[cacheKey];
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
      return res.json(cached.translations);
    }

    const pool = getAppPool();

    // Build English base from translations_source (DB) with ENGLISH_DEFAULTS fallback
    let englishBase;
    try {
      let srcQuery = 'SELECT translation_key, english_text FROM translations_source WHERE is_active = 1';
      const srcParams = [];
      if (namespaces) {
        srcQuery += ` AND namespace IN (${namespaces.map(() => '?').join(',')})`;
        srcParams.push(...namespaces);
      }
      const [srcRows] = await pool.query(srcQuery, srcParams);
      englishBase = {};
      for (const row of srcRows) {
        englishBase[row.translation_key] = row.english_text;
      }
    } catch (dbErr) {
      console.warn('[i18n] translations_source query failed, using ENGLISH_DEFAULTS:', dbErr.message);
      englishBase = filterByNamespace(ENGLISH_DEFAULTS, namespaces);
    }

    // English or unsupported language — return English base
    if (lang === 'en' || !SUPPORTED_LANGS.has(lang)) {
      cache[cacheKey] = { translations: englishBase, cachedAt: Date.now() };
      return res.json(englishBase);
    }

    // Non-English: overlay with localized translations from new table
    const translations = { ...englishBase };
    try {
      let locQuery = `SELECT tl.translation_key, tl.translated_text
                       FROM translations_localized tl
                       INNER JOIN translations_source ts ON ts.translation_key = tl.translation_key AND ts.is_active = 1
                       WHERE tl.language_code = ? AND tl.status IN ('current', 'review', 'outdated', 'draft')`;
      const locParams = [lang];
      if (namespaces) {
        locQuery += ` AND ts.namespace IN (${namespaces.map(() => '?').join(',')})`;
        locParams.push(...namespaces);
      }
      const [locRows] = await pool.query(locQuery, locParams);
      for (const row of locRows) {
        translations[row.translation_key] = row.translated_text;
      }
    } catch (dbErr) {
      // Fall back to old ui_translations table
      console.warn('[i18n] translations_localized query failed, trying ui_translations:', dbErr.message);
      let rows;
      if (namespaces) {
        const placeholders = namespaces.map(() => '?').join(',');
        [rows] = await pool.query(
          `SELECT translation_key, translation_text FROM ui_translations WHERE lang_code = ? AND namespace IN (${placeholders})`,
          [lang, ...namespaces]
        );
      } else {
        [rows] = await pool.query(
          'SELECT translation_key, translation_text FROM ui_translations WHERE lang_code = ?',
          [lang]
        );
      }
      for (const row of rows) {
        translations[row.translation_key] = row.translation_text;
      }
    }

    // Update cache
    cache[cacheKey] = { translations, cachedAt: Date.now() };
    return res.json(translations);
  } catch (err) {
    console.error('[i18n] Error fetching translations:', err.message);
    // On error, still return English defaults so the UI never breaks
    const namespaces = parseNamespaces(req.query.ns);
    return res.json(filterByNamespace(ENGLISH_DEFAULTS, namespaces));
  }
});

// GET /api/i18n — list available languages
router.get('/', (req, res) => {
  res.json({
    default: 'en',
    supported: ['en', 'el', 'ru', 'ro', 'ka'],
    labels: {
      en: 'English',
      el: 'Ελληνικά',
      ru: 'Русский',
      ro: 'Română',
      ka: 'ქართული',
    },
  });
});

module.exports = router;
