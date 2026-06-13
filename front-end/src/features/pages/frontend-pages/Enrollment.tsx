import PublicSeo from '@/components/seo/PublicSeo';
import OmChurchOnboarding from '@/components/om-church-onboarding/v1/App';

/**
 * Public homepage CTA "Enroll Now" lands here.
 *
 * Renders inside PublicLayout (HpHeader + SiteFooter). The onboarding wizard
 * uses scoped theme tokens aligned with the site design system.
 */
const Enrollment = () => {
  return (
    <>
      <PublicSeo
        title="Enroll Your Parish"
        description="Enroll your Orthodox parish in Orthodox Metrics — sacramental record digitization, OCR, and modern parish administration."
        path="/enroll"
      />
      <OmChurchOnboarding />
    </>
  );
};

export default Enrollment;
