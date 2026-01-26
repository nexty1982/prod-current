import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Stack,
  useTheme,
} from "@mui/material";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { styled } from "@mui/material/styles";

// OCA Record Book Timeline
// Visual, navigable timeline of metrical-book history for OrthodoxMetrics

interface Era {
  id: string;
  years: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
}

const eras: Era[] = [
  {
    id: "mission-era",
    years: "1900–1960s",
    label: "Russian Mission / Early Metropolia",
    title: "Parish Metrical Books under the Russian Mission",
    subtitle:
      "Handwritten parish registers in Russian / Church Slavonic with early English appearing mid‑century.",
    description:
      "Parishes in the North American Russian Mission and early Metropolia era kept bound metrical books combining baptisms, marriages, and deaths/burials. Layouts varied by printer and local custom, but the core sacramental data was already stable.",
    highlights: [
      "One physical volume per parish, often divided into sections for baptism, marriage, and burial records.",
      "Language primarily Russian / Church Slavonic, with English added gradually in some parishes.",
      "Strong emphasis on village of origin and old‑country details alongside North American residence.",
      "No single OCA‑wide template yet; formats were influenced by Russian Imperial practice and local print houses.",
    ],
  },
  {
    id: "metropolia-standard",
    years: "1960s–2002",
    label: "Metropolia / Early OCA Standard Book",
    title: "Standard Metropolia / OCA Metrical Book (OCPC)",
    subtitle:
      "First broadly standardized English‑language metrical book sold through central church channels.",
    description:
      "As the Metropolia matured and transitioned into the Orthodox Church in America, a more uniform metrical book emerged and was distributed via the Orthodox Christian Publication Center. This gave parishes a consistent structure for recording sacraments across the U.S. and Canada.",
    highlights: [
      "Standardized printed metrical book available centrally, replacing highly variable local layouts.",
      "Core sections for Baptisms, Marriages, and Deaths/Burials remained, now in English with room for other languages.",
      "Better alignment with U.S. and Canadian civil documentation and parish administrative needs.",
      "Reception of converts appears in certificates and pastoral practice, even if not yet a separately titled register section in every book.",
    ],
  },
  {
    id: "book-2003",
    years: "2003",
    label: "2003 Metrical Record Book",
    title: "2003 OCA Metrical Record Book",
    subtitle:
      "A clearly defined OCA‑wide edition with sharpened canonical and administrative language.",
    description:
      "In 2003, the Orthodox Church in America introduced a formal Metrical Record Book edition. It systematized how parishes record baptisms, marriages, funerals, and receptions, following updated canonical and pastoral guidelines.",
    highlights: [
      "Unified OCA layout and wording across North American parishes.",
      "Clearer prompts for sacramental information such as parents' names, sponsors/witnesses, and officiating clergy.",
      "Better integration with contemporary parish office workflows and certificate issuing.",
      "Set the baseline that would later be corrected and refined in the 2016 edition.",
    ],
  },
  {
    id: "book-2016",
    years: "2016",
    label: "2016 Corrected Edition",
    title: "2016 Corrected Edition of the 2003 Book",
    subtitle:
      "Textual and structural corrections to the 2003 design, approved by the Holy Synod.",
    description:
      "A corrected edition of the 2003 metrical book was released in 2016. It preserved the general structure while fixing wording, clarifying fields, and tightening alignment with pastoral and canonical norms.",
    highlights: [
      "Refinements to headings, instructions, and field labels for clarity.",
      "Improved consistency across sections (Baptism, Marriage, Funeral, Reception into the Church).",
      "Closer alignment with contemporary clergy guidelines on what must be recorded.",
      "Served as the immediate ancestor to the redesigned 2018 volume.",
    ],
  },
  {
    id: "book-2018",
    years: "2018–Present",
    label: "2018 New Metrical Book",
    title: "2018 OCA New Metrical Book",
    subtitle:
      "Redesigned hard‑cover volume with a dedicated section for receptions and a built‑in surname index.",
    description:
      "Working with SVS Press, the OCA released a new hard‑cover metrical book in 2018. It formally highlights receptions into the Church and adds an internal surname index, making long‑term lookup and auditing of entries more efficient.",
    highlights: [
      "Four explicit registries: Baptisms, Receptions into the Church, Marriages, Funerals.",
      "Surname index spanning the volume for faster lookup and cross‑referencing.",
      "Layout follows modern clergy guidelines treating the metrical book as the authoritative parish record.",
      "Bridges historic sacramental practice with contemporary archival and analytics needs—ideal for digital modeling in systems like OrthodoxMetrics.",
    ],
  },
];

// Styled Components
const TimelineContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4, 3),
  borderRadius: theme.spacing(3),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(to bottom, rgba(30, 30, 40, 0.95), rgba(20, 20, 30, 0.98))'
    : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.98), rgba(250, 250, 255, 1))',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.2)' : 'rgba(200, 162, 75, 0.3)'}`,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(200, 162, 75, 0.1)'
    : '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(200, 162, 75, 0.1)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3, 2),
  },
}));

const TimelineHeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
}));

const HeaderLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  color: theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.8)' : '#C8A24B',
  marginBottom: theme.spacing(0.5),
}));

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  fontSize: '2rem',
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
  marginBottom: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.5rem',
  },
}));

const HeaderSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#666666',
  maxWidth: '600px',
}));

const InfoBadge = styled(Chip)(({ theme }) => ({
  fontSize: '0.75rem',
  height: 'auto',
  padding: theme.spacing(0.75, 1.5),
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(200, 162, 75, 0.15)' 
    : 'rgba(200, 162, 75, 0.1)',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.3)' : 'rgba(200, 162, 75, 0.4)'}`,
  color: theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.9)' : '#C8A24B',
  '& .MuiChip-label': {
    padding: 0,
  },
}));

const TimelineRail = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginBottom: theme.spacing(4),
  padding: theme.spacing(2, 0),
}));

const TimelineLine = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: theme.spacing(4),
  right: theme.spacing(4),
  top: '50%',
  height: '1px',
  transform: 'translateY(-50%)',
  background: `linear-gradient(to right, transparent, ${theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.3)' : 'rgba(200, 162, 75, 0.4)'}, transparent)`,
}));

const TimelinePointsContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  padding: theme.spacing(0, 1),
}));

const TimelinePointButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'isPast',
})<{ isActive?: boolean; isPast?: boolean }>(({ theme, isActive, isPast }) => ({
  minWidth: 'auto',
  padding: 0,
  flexDirection: 'column',
  gap: theme.spacing(1),
  textTransform: 'none',
  '&:hover': {
    backgroundColor: 'transparent',
  },
}));

const TimelinePointCircle = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'isPast',
})<{ isActive?: boolean; isPast?: boolean }>(({ theme, isActive, isPast }) => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `2px solid ${
    isActive
      ? '#C8A24B'
      : isPast
      ? (theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.6)' : '#4CAF50')
      : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)')
  }`,
  backgroundColor: theme.palette.mode === 'dark' 
    ? (isActive ? 'rgba(46, 15, 70, 0.8)' : 'rgba(20, 20, 30, 0.9)')
    : (isActive ? 'rgba(255, 255, 255, 0.95)' : '#fafafa'),
  boxShadow: isActive
    ? `0 0 0 2px ${theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.3)' : 'rgba(200, 162, 75, 0.2)'}`
    : 'none',
  transition: 'all 0.3s ease',
}));

const TimelinePointDot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'isPast',
})<{ isActive?: boolean; isPast?: boolean }>(({ theme, isActive, isPast }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: isActive
    ? '#C8A24B'
    : isPast
    ? (theme.palette.mode === 'dark' ? '#4CAF50' : '#4CAF50')
    : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'),
  transform: isActive ? 'scale(1.2)' : 'scale(1)',
  transition: 'all 0.3s ease',
}));

const TimelinePointLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.6875rem',
  fontWeight: 500,
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#666666',
  textAlign: 'center',
  marginTop: theme.spacing(0.5),
}));

const TimelinePointSublabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.6875rem',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : '#999999',
  textAlign: 'center',
  marginTop: theme.spacing(0.25),
  display: 'none',
  [theme.breakpoints.up('sm')]: {
    display: 'block',
    maxWidth: 128,
  },
}));

const DetailPanel = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  borderRadius: theme.spacing(2),
  padding: theme.spacing(3),
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.2)' : 'rgba(200, 162, 75, 0.2)'}`,
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(20, 20, 30, 0.6)' 
    : 'rgba(250, 250, 255, 0.8)',
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: '1.4fr 1.2fr',
    padding: theme.spacing(4),
  },
}));

const EraBadge = styled(Chip)(({ theme }) => ({
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  height: 'auto',
  padding: theme.spacing(0.5, 1.5),
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(200, 162, 75, 0.2)' 
    : 'rgba(200, 162, 75, 0.15)',
  color: theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.9)' : '#C8A24B',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.3)' : 'rgba(200, 162, 75, 0.3)'}`,
  marginBottom: theme.spacing(1),
}));

const EraTitle = styled(Typography)(({ theme }) => ({
  fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
  marginBottom: theme.spacing(0.5),
}));

const EraSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#666666',
  marginBottom: theme.spacing(1),
}));

const EraDescription = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  lineHeight: 1.6,
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#666666',
  marginBottom: theme.spacing(2),
}));

const HighlightItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
}));

const HighlightDot = styled(Box)(({ theme }) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: '#C8A24B',
  marginTop: theme.spacing(1),
  flexShrink: 0,
}));

const HighlightText = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  lineHeight: 1.6,
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#666666',
}));

const MetaSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(2),
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.2)' : 'rgba(200, 162, 75, 0.2)'}`,
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(20, 20, 30, 0.5)' 
    : 'rgba(250, 250, 255, 0.6)',
}));

const MetaLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#999999',
  marginBottom: theme.spacing(1),
}));

const MetaText = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  lineHeight: 1.6,
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#666666',
  marginBottom: theme.spacing(1),
}));

const NavigationBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.2)' : 'rgba(200, 162, 75, 0.2)'}`,
}));

const StepInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}));

const StepText = styled(Typography)(({ theme }) => ({
  fontSize: '0.6875rem',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#999999',
}));

const StepHint = styled(Typography)(({ theme }) => ({
  fontSize: '0.6875rem',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : '#bbbbbb',
}));

const NavButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isPrimary',
})<{ isPrimary?: boolean }>(({ theme, isPrimary }) => ({
  minWidth: 'auto',
  padding: theme.spacing(0.75, 2),
  fontSize: '0.75rem',
  fontWeight: isPrimary ? 600 : 500,
  textTransform: 'none',
  borderRadius: theme.spacing(3),
  border: `1px solid ${isPrimary ? '#C8A24B' : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)')}`,
  backgroundColor: isPrimary
    ? (theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.9)' : '#C8A24B')
    : 'transparent',
  color: isPrimary
    ? (theme.palette.mode === 'dark' ? '#2E0F46' : '#ffffff')
    : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#666666'),
  '&:hover': {
    backgroundColor: isPrimary
      ? (theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 1)' : '#D4B05A')
      : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(200, 162, 75, 0.1)'),
    borderColor: isPrimary ? '#C8A24B' : '#C8A24B',
  },
  '&:disabled': {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
}));

const OCARecordBookTimeline: React.FC = () => {
  const theme = useTheme();
  const [activeId, setActiveId] = useState<string>(eras[0].id);

  const activeIndex = eras.findIndex((e) => e.id === activeId);
  const activeEra = eras[activeIndex] ?? eras[0];

  const goTo = (index: number) => {
    if (index < 0 || index >= eras.length) return;
    setActiveId(eras[index].id);
  };

  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  const getEraDataNote = (eraId: string) => {
    const notes: Record<string, string[]> = {
      "mission-era": [
        "Expect handwritten registers, mixed languages, and dense narrative notes you will normalize into structured fields.",
        "Ideal to model as a three‑section volume: Baptism, Marriage, Burial, with rich origin metadata.",
      ],
      "metropolia-standard": [
        "Data becomes more uniform across parishes. English fields start to look like modern OrthodoMetrics schemas.",
        "Use this as a bridge between legacy Russian‑style books and modern OCA layouts.",
      ],
      "book-2003": [
        "Highly mappable to a canonical \"OCA 2003\" template with consistent field names and section boundaries.",
        "This is a natural baseline template for 21st‑century North American entries.",
      ],
      "book-2016": [
        "Same overall schema as 2003 but with corrected wording. Consider it a minor version bump in your template mapping.",
        "Tag source volumes as \"2003‑corrected\" if you need to track exact form language.",
      ],
      "book-2018": [
        "Fully aligned with current practice and easiest to digitize: receptions are a first‑class register and the surname index suggests how to structure search.",
        "Treat this as your \"gold standard\" schema and back‑map earlier eras into it.",
      ],
    };
    return notes[eraId] || [];
  };

  return (
    <TimelineContainer>
        {/* Header */}
        <TimelineHeaderBox>
          <Box>
            <HeaderLabel>OrthodoxMetrics • Design Reference</HeaderLabel>
            <HeaderTitle>OCA Metrical Book Timeline</HeaderTitle>
            <HeaderSubtitle>
              Explore how official parish record books have advanced from the Russian Mission era
              to the current OCA metrical book used today.
            </HeaderSubtitle>
          </Box>
          <Stack direction="column" spacing={1} alignItems="flex-end">
            <InfoBadge
              icon={
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.mode === 'dark' ? '#4CAF50' : '#4CAF50',
                    marginLeft: 1,
                  }}
                />
              }
              label="Click a milestone or use Prev / Next to navigate"
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6875rem',
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : '#bbbbbb',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Ideal source for mapping analog books into digital schemas.
            </Typography>
          </Stack>
        </TimelineHeaderBox>

        {/* Timeline rail */}
        <TimelineRail>
          <TimelineLine />
          <TimelinePointsContainer>
            {eras.map((era, index) => {
              const isActive = era.id === activeId;
              const isPast = index < activeIndex;
              return (
                <TimelinePointButton
                  key={era.id}
                  isActive={isActive}
                  isPast={isPast}
                  onClick={() => setActiveId(era.id)}
                >
                  <TimelinePointCircle isActive={isActive} isPast={isPast}>
                    <TimelinePointDot isActive={isActive} isPast={isPast} />
                  </TimelinePointCircle>
                  <TimelinePointLabel>{era.years}</TimelinePointLabel>
                  <TimelinePointSublabel>{era.label}</TimelinePointSublabel>
                </TimelinePointButton>
              );
            })}
          </TimelinePointsContainer>
        </TimelineRail>

        {/* Detail panel */}
        <DetailPanel>
          {/* Text side */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <EraBadge label={activeEra.years} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.6875rem',
                  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : '#999999',
                }}
              >
                Era
              </Typography>
            </Stack>

            <EraTitle>{activeEra.title}</EraTitle>
            <EraSubtitle>{activeEra.subtitle}</EraSubtitle>
            <EraDescription>{activeEra.description}</EraDescription>

            <Box sx={{ mt: 2 }}>
              {activeEra.highlights.map((item, idx) => (
                <HighlightItem key={idx}>
                  <HighlightDot />
                  <HighlightText>{item}</HighlightText>
                </HighlightItem>
              ))}
            </Box>
          </Box>

          {/* Meta / navigation side */}
          <MetaSection>
            <Box>
              <MetaLabel>How this era feels in data</MetaLabel>
              <Box sx={{ mt: 1 }}>
                {getEraDataNote(activeEra.id).map((note, idx) => (
                  <MetaText key={idx}>{note}</MetaText>
                ))}
              </Box>
            </Box>

            <NavigationBox>
              <StepInfo>
                <StepText>
                  Step {activeIndex + 1} of {eras.length}
                </StepText>
                <StepHint>
                  Use this structure as a visual explainer for parish or demo onboarding.
                </StepHint>
              </StepInfo>
              <Stack direction="row" spacing={1}>
                <NavButton
                  startIcon={<IconArrowLeft size={16} />}
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                >
                  Prev
                </NavButton>
                <NavButton
                  isPrimary
                  endIcon={<IconArrowRight size={16} />}
                  onClick={goNext}
                  disabled={activeIndex === eras.length - 1}
                >
                  Next
                </NavButton>
              </Stack>
            </NavigationBox>
          </MetaSection>
        </DetailPanel>
      </TimelineContainer>
  );
};

export default OCARecordBookTimeline;
