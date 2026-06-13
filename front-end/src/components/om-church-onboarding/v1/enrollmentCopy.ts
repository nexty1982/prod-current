import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export type TFn = (key: string) => string;

const JURISDICTION_SLUGS = ['goa', 'oca', 'antiochian', 'serbian', 'rocor', 'romanian', 'other'] as const;
const SIZE_SLUGS = ['under_100', '100_200', '200_500', '500_1000', '1000_plus'] as const;

export function useEnrollmentCopy() {
  const { t } = useLanguage();
  return useMemo(() => buildEnrollmentCopy(t), [t]);
}

export function buildEnrollmentCopy(t: TFn) {
  const stepLabel = (n: number) => t('enroll.wizard.step_label').replace('{n}', String(n));

  const wizardSteps = [
    { key: 'find-parish' as const, label: t('enroll.steps.find_parish'), n: 1 },
    { key: 'contact' as const, label: t('enroll.steps.contact'), n: 2 },
    { key: 'parish' as const, label: t('enroll.steps.parish'), n: 3 },
    { key: 'location' as const, label: t('enroll.steps.location'), n: 4 },
    { key: 'modules' as const, label: t('enroll.steps.modules'), n: 5 },
  ];

  const importMethods = [
    {
      value: 'om_full_service' as const,
      label: t('enroll.modules.import.om_full_service.label'),
      description: t('enroll.modules.import.om_full_service.description'),
    },
    {
      value: 'self_service' as const,
      label: t('enroll.modules.import.self_service.label'),
      description: t('enroll.modules.import.self_service.description'),
    },
  ];

  const startTimelines = [
    { value: 'asap' as const, label: t('enroll.modules.timeline.asap') },
    { value: 'few_weeks' as const, label: t('enroll.modules.timeline.few_weeks') },
    { value: 'month_plus' as const, label: t('enroll.modules.timeline.month_plus') },
  ];

  const moduleSubStages = [
    { n: 1, label: t('enroll.modules.stage.record_types') },
    { n: 2, label: t('enroll.modules.stage.import_method') },
    { n: 3, label: t('enroll.modules.stage.start_timeline') },
  ];

  const moduleCards = [
    {
      key: 'baptism',
      title: t('enroll.landing.sacrament.baptism.label'),
      desc: t('enroll.landing.sacrament.baptism.desc'),
      recommended: true,
    },
    {
      key: 'marriage',
      title: t('enroll.landing.sacrament.marriage.label'),
      desc: t('enroll.landing.sacrament.marriage.desc'),
      recommended: true,
    },
    {
      key: 'funeral',
      title: t('enroll.landing.sacrament.funeral.label'),
      desc: t('enroll.landing.sacrament.funeral.desc'),
      recommended: false,
    },
    {
      key: 'custom',
      title: t('enroll.module_type.custom'),
      desc: t('enroll.modules.select_prompt'),
      recommended: false,
    },
  ];

  const moduleLabels: Record<string, string> = {
    baptism: t('enroll.module_type.baptism'),
    marriage: t('enroll.module_type.marriage'),
    funeral: t('enroll.module_type.funeral'),
    custom: t('enroll.module_type.custom'),
  };

  const jurisdictions = JURISDICTION_SLUGS.map((slug) => ({
    value: t(`enroll.jurisdiction.${slug}`),
    slug,
  }));

  const churchSizes = SIZE_SLUGS.map((slug) => ({
    value: t(`enroll.size.${slug}`),
    slug,
  }));

  const sacraments = [
    { key: 'baptism', label: t('enroll.landing.sacrament.baptism.label'), desc: t('enroll.landing.sacrament.baptism.desc') },
    { key: 'marriage', label: t('enroll.landing.sacrament.marriage.label'), desc: t('enroll.landing.sacrament.marriage.desc') },
    { key: 'funeral', label: t('enroll.landing.sacrament.funeral.label'), desc: t('enroll.landing.sacrament.funeral.desc') },
  ];

  const confirmNextSteps = [
    { title: t('enroll.confirm.next_step1.title'), description: t('enroll.confirm.next_step1.description') },
    { title: t('enroll.confirm.next_step2.title'), description: t('enroll.confirm.next_step2.description') },
    { title: t('enroll.confirm.next_step3.title'), description: t('enroll.confirm.next_step3.description') },
    { title: t('enroll.confirm.next_step4.title'), description: t('enroll.confirm.next_step4.description') },
  ];

  return {
    t,
    stepLabel,
    wizardSteps,
    importMethods,
    startTimelines,
    moduleSubStages,
    moduleCards,
    moduleLabels,
    jurisdictions,
    churchSizes,
    sacraments,
    confirmNextSteps,
    formatImportMethod: (value: string) =>
      importMethods.find((o) => o.value === value)?.label ?? value,
    formatStartTimeline: (value: string) =>
      startTimelines.find((o) => o.value === value)?.label ?? value,
    wizardProgress: (current: number, total: number) =>
      t('enroll.wizard.sidebar_progress')
        .replace('{current}', String(current))
        .replace('{total}', String(total))
        .replace(/ · about 5 minutes$/, ''),
    confirmReceivedBody: (firstName: string, churchName: string) =>
      t('enroll.confirm.received_message')
        .replace('{firstName}', firstName ? `, ${firstName}` : '')
        .replace('{churchName}', churchName),
    landing: {
      badge: t('enroll.landing.badge'),
      headlinePrefix: t('enroll.landing.hero_title'),
      headlineAccent: t('enroll.landing.hero_highlight'),
      body: t('enroll.landing.subtitle'),
      ctaStart: t('enroll.landing.cta_start'),
      ctaContact: t('enroll.landing.cta_contact'),
      trustReviewed: t('enroll.landing.trust_reviewed'),
      trustEncrypted: t('enroll.landing.trust_encrypted'),
      onboardingTitle: t('enroll.landing.how_it_works'),
      landingSteps: [
        { n: 1, title: t('enroll.landing.step1_title'), desc: t('enroll.landing.step1_desc') },
        { n: 2, title: t('enroll.landing.step2_title'), desc: t('enroll.landing.step2_desc') },
        { n: 3, title: t('enroll.landing.step3_title'), desc: t('enroll.landing.step3_desc') },
        { n: 4, title: t('enroll.landing.step4_title'), desc: t('enroll.landing.step4_desc') },
      ],
      carouselLabel: t('enroll.landing.carousel.region_label'),
      carouselSlidesLabel: t('enroll.landing.carousel.tablist_label'),
      carouselShowing: (label: string) => t('enroll.landing.carousel.now_showing').replace('{label}', label),
    },
    complete: {
      title: t('enroll.app_complete.title'),
      body: t('enroll.app_complete.subtitle'),
      backHome: t('enroll.app_complete.back_home'),
      contact: t('enroll.app_complete.contact_us'),
    },
    nav: {
      cancel: t('enroll.wizard.cancel'),
      back: t('enroll.wizard.back'),
      continue: t('enroll.wizard.continue'),
      next: t('enroll.wizard.next'),
      skip: t('enroll.wizard.skip_for_now'),
      submit: t('enroll.wizard.submit'),
      submitting: t('enroll.wizard.submitting'),
    },
    wizard: {
      title: t('enroll.wizard.sidebar_title'),
      duration: t('enroll.wizard.duration_hint'),
      progressAria: t('enroll.wizard.progress_aria'),
      completeRequired: t('enroll.wizard.required_fields_notice'),
    },
    findParish: {
      title: t('enroll.section.find_parish.title'),
      description: t('enroll.section.find_parish.description'),
      statePlaceholder: t('enroll.find_parish.placeholder.select_state'),
      mapLabel: t('enroll.find_parish.map.title'),
      mapHint: t('enroll.find_parish.map.help'),
      loadingMap: t('enroll.find_parish.map.loading'),
      mapUnavailable: t('enroll.find_parish.map.unavailable'),
      parishName: t('enroll.find_parish.field.parish_name'),
      parishHint: t('enroll.find_parish.hint.parish_name'),
      parishPlaceholder: t('enroll.find_parish.placeholder.parish_name'),
      searching: t('enroll.find_parish.map.loading'),
      noResults: t('enroll.find_parish.search.no_results'),
      selected: t('enroll.find_parish.selected.change'),
      notListed: t('enroll.find_parish.toggle.not_listed'),
      cancelSearch: t('enroll.find_parish.toggle.search_list'),
      manualLabel: t('enroll.find_parish.field.manual_name'),
      manualHint: t('enroll.find_parish.hint.manual_name'),
      manualPlaceholder: t('enroll.find_parish.placeholder.manual_name'),
      crmTip: `${t('enroll.find_parish.crm_tip')} ${t('enroll.find_parish.crm_tip_action')}`,
    },
    contact: {
      title: t('enroll.section.contact.title'),
      description: t('enroll.section.contact.description'),
      firstName: t('enroll.contact.field.first_name'),
      lastName: t('enroll.contact.field.last_name'),
      email: t('enroll.contact.field.email'),
      emailHint: t('enroll.contact.hint.email'),
    },
    parishInfo: {
      title: t('enroll.section.parish.title'),
      description: t('enroll.section.parish.description'),
      churchName: t('enroll.parish.field.church_name'),
      jurisdiction: t('enroll.parish.field.jurisdiction'),
      jurisdictionHint: t('enroll.parish.hint.jurisdiction'),
      jurisdictionPlaceholder: t('enroll.parish.placeholder.select_jurisdiction'),
      phone: t('enroll.parish.field.phone'),
      website: t('enroll.parish.field.website'),
      size: t('enroll.parish.field.size'),
      sizePlaceholder: t('enroll.parish.placeholder.select_size'),
      referral: t('enroll.parish.field.referral'),
      optional: t('enroll.optional'),
    },
    location: {
      title: t('enroll.section.location.title'),
      description: t('enroll.section.location.description'),
      street: t('enroll.location.field.street'),
      city: t('enroll.location.field.city'),
      state: t('enroll.location.field.state'),
      zip: t('enroll.location.field.postal'),
      zipSuggested: t('enroll.location.hint.postal_suggested'),
      country: t('enroll.location.field.country'),
      timezone: t('enroll.location.field.timezone'),
      timezonePlaceholder: t('enroll.location.placeholder.select_timezone'),
    },
    modules: {
      title: t('enroll.section.modules.title'),
      description: t('enroll.section.modules.description'),
      selectPrompt: t('enroll.modules.select_prompt'),
      recommended: t('enroll.modules.recommended'),
      selected: t('enroll.modules.selected'),
      tapToSelect: t('enroll.modules.tap_to_select'),
      selectedCount: t('enroll.modules.summary.selected_modules'),
      selectedModules: t('enroll.modules.summary.selected_modules'),
      importLabel: t('enroll.modules.import.legend'),
      importQuestion: t('enroll.modules.import.legend'),
      importAria: t('enroll.modules.import.aria'),
      timelineQuestion: t('enroll.modules.timeline.legend'),
      timelineAria: t('enroll.modules.timeline.aria'),
      submitTip: t('enroll.modules.submit_tip'),
    },
    confirm: {
      brand: t('common.brand_name'),
      receivedTitle: t('enroll.confirm.title'),
      reference: t('enroll.confirm.reference_label'),
      copyReference: t('enroll.confirm.copy_reference'),
      copied: t('enroll.confirm.copied'),
      whatNext: t('enroll.confirm.what_happens_next'),
      submissionTitle: t('enroll.confirm.submission_title'),
      detailChurch: t('enroll.confirm.submission.church'),
      detailEmail: t('enroll.confirm.submission.contact_email'),
      detailModules: t('enroll.confirm.submission.modules'),
      detailImport: t('enroll.confirm.submission.import'),
      detailTimeline: t('enroll.confirm.submission.getting_started'),
      none: t('enroll.confirm.none'),
      helpTitle: t('enroll.confirm.need_help_title'),
      helpBody: t('enroll.confirm.need_help_body'),
      returnHome: t('enroll.confirm.return_home'),
      contactUs: t('enroll.confirm.contact_us'),
      showDetails: t('enroll.confirm.view_details'),
      hideDetails: t('enroll.confirm.hide_details'),
      footer: t('enroll.confirm.footer').replace('{year}', String(new Date().getFullYear())),
    },
    errors: {
      submitFailed: t('enroll.validation.submit_failed'),
      network: t('enroll.validation.network_error'),
      firstName: t('enroll.validation.first_name_required'),
      lastName: t('enroll.validation.last_name_required'),
      emailRequired: t('enroll.validation.email_required'),
      emailInvalid: t('enroll.validation.email_invalid'),
      churchName: t('enroll.validation.church_name_required'),
      modules: t('enroll.validation.modules_required'),
      importMethod: t('enroll.validation.import_method_required'),
      startTimeline: t('enroll.validation.start_timeline_required'),
    },
  };
}

export function validateContactFields(p: Record<string, unknown>, t: TFn): Record<string, string> {
  const e: Record<string, string> = {};
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!String(p.firstName ?? '').trim()) e.firstName = t('enroll.validation.first_name_required');
  if (!String(p.lastName ?? '').trim()) e.lastName = t('enroll.validation.last_name_required');
  if (!String(p.email ?? '').trim()) e.email = t('enroll.validation.email_required');
  else if (!EMAIL_RE.test(String(p.email).trim())) e.email = t('enroll.validation.email_invalid');
  return e;
}

export function validateParishFields(p: Record<string, unknown>, t: TFn): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(p.churchName ?? '').trim()) e.churchName = t('enroll.validation.church_name_required');
  return e;
}

export function validateModulesFields(
  modules: Record<string, boolean>,
  importMethod: string,
  startTimeline: string,
  t: TFn,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Object.values(modules).some(Boolean)) e.modules = t('enroll.validation.modules_required');
  if (!importMethod) e.importMethod = t('enroll.validation.import_method_required');
  if (!startTimeline) e.startTimeline = t('enroll.validation.start_timeline_required');
  return e;
}
