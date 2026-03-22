/**
 * AccountParishInfoPage — Parish membership & church association overview.
 *
 * Read-only page showing the user's church context, role, and parish details.
 * Data sourced from:
 *   - useAuth()              → church_id, role
 *   - GET /api/my/church-settings → full church details
 *
 * Permission-aware action links to Church Details / Branding when user has edit access.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ChurchIcon from '@mui/icons-material/Church';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PublicIcon from '@mui/icons-material/Public';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import PaletteIcon from '@mui/icons-material/Palette';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '@/context/AuthContext';
import { getRoleLabel } from '@/utils/roleAvatars';
import { canEditBasicChurchInfo, canEditChurchSettings } from './accountPermissions';
import { LANGUAGE_LABELS, ROLE_DESCRIPTIONS, getChurchDisplayName } from './accountConstants';
import { churchApi } from './accountApi';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChurchSettings {
  id: number;
  name: string;
  church_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  preferred_language: string | null;
  timezone: string | null;
  currency: string | null;
  calendar_type: string | null;
  website: string | null;
  jurisdiction: string | null;
  short_name: string | null;
  has_baptism_records: number | boolean;
  has_marriage_records: number | boolean;
  has_funeral_records: number | boolean;
  created_at: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatAddress(s: ChurchSettings): string | null {
  const parts = [s.address, s.city, s.state_province, s.postal_code].filter(Boolean);
  if (parts.length === 0) return null;
  // "605 Washington Ave, Manville, NJ 08835"
  const street = s.address || '';
  const cityState = [s.city, s.state_province].filter(Boolean).join(', ');
  const line = [street, cityState].filter(Boolean).join(', ');
  return s.postal_code ? `${line} ${s.postal_code}` : line;
}

function toBool(v: number | boolean | null | undefined): boolean {
  return v === 1 || v === true;
}

// ── Component ──────────────────────────────────────────────────────────────

const AccountParishInfoPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [church, setChurch] = useState<ChurchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load church settings ──

  useEffect(() => {
    if (!user?.church_id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const settings = await churchApi.getSettings<ChurchSettings>();
        if (settings) {
          setChurch(settings);
        }
      } catch {
        setError('Unable to load church information.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.church_id]);

  // ── Permission checks ──

  const canEditDetails = canEditBasicChurchInfo(user);
  const canEditBranding = canEditChurchSettings(user);

  // ── No church context ──

  if (!user?.church_id) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <ChurchIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Parish Membership
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Your church affiliation and role
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              px: 3,
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <ChurchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Parish Affiliation
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 400, mx: 'auto' }}>
              Your account is not currently associated with a parish. Contact your church administrator
              to be added to a parish on the platform.
            </Typography>
            <Chip
              label={getRoleLabel(user?.role)}
              size="small"
              variant="outlined"
              sx={{ mt: 2 }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ── Loading ──

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Error ──

  if (error || !church) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Alert severity="warning">{error || 'Unable to load church information.'}</Alert>
        </CardContent>
      </Card>
    );
  }

  // ── Derived values ──

  const displayName = getChurchDisplayName(church) || '—';
  const address = formatAddress(church);
  const recordTypes = [
    toBool(church.has_baptism_records) && 'Baptism',
    toBool(church.has_marriage_records) && 'Marriage',
    toBool(church.has_funeral_records) && 'Funeral',
  ].filter(Boolean) as string[];

  // ── Render ──

  return (
    <>
      {/* ── Membership Overview ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <ChurchIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Parish Membership
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Your church affiliation and role in the system.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Hero card */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ChurchIcon sx={{ fontSize: 28, color: 'primary.contrastText' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={600} noWrap>
                {displayName}
              </Typography>
              {church.short_name && church.short_name !== displayName && (
                <Typography variant="caption" color="text.disabled">
                  {church.short_name}
                </Typography>
              )}
              <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
                <Chip
                  icon={<PersonIcon sx={{ fontSize: 16 }} />}
                  label={getRoleLabel(user?.role)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                {church.jurisdiction && (
                  <Chip
                    label={church.jurisdiction}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Role & Access ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <PersonIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Role & Access
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Your permissions within this parish.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            <PersonIcon sx={{ color: 'primary.main', mt: 0.25 }} />
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="body1" fontWeight={600}>
                  {getRoleLabel(user?.role)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {ROLE_DESCRIPTIONS[user?.role || ''] || 'Standard access to the platform.'}
              </Typography>
              <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                <AccessChip label="View Records" allowed />
                <AccessChip label="Edit Church Details" allowed={canEditDetails} />
                <AccessChip label="Manage Branding" allowed={canEditBranding} />
              </Stack>
            </Box>
          </Box>

          {/* Info note */}
          <Box display="flex" alignItems="flex-start" gap={1} mt={2} sx={{ px: 1 }}>
            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.25 }} />
            <Typography variant="caption" color="text.disabled">
              Your role is managed by your church administrator. Contact them if you need different access.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* ── Church Details ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <InfoOutlinedIcon color="primary" />
              <Typography variant="h5" fontWeight={600}>
                Church Information
              </Typography>
            </Box>
            {canEditDetails && (
              <Button
                size="small"
                variant="text"
                startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                onClick={() => navigate('/account/church-details')}
                sx={{ textTransform: 'none' }}
              >
                Edit
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {canEditDetails ? 'Parish contact and location details.' : 'Parish contact and location details (read-only).'}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
            gap={2}
          >
            <DetailRow icon={<ChurchIcon sx={{ fontSize: 18 }} />} label="Full Name" value={displayName} />
            {address && <DetailRow icon={<PlaceIcon sx={{ fontSize: 18 }} />} label="Address" value={address} />}
            {church.country && <DetailRow icon={<PublicIcon sx={{ fontSize: 18 }} />} label="Country" value={church.country} />}
            {church.phone && <DetailRow icon={<PhoneIcon sx={{ fontSize: 18 }} />} label="Phone" value={church.phone} />}
            {church.email && <DetailRow icon={<EmailIcon sx={{ fontSize: 18 }} />} label="Email" value={church.email} />}
            {church.website && (
              <DetailRow
                icon={<LanguageIcon sx={{ fontSize: 18 }} />}
                label="Website"
                value={church.website}
                link={church.website.startsWith('http') ? church.website : `https://${church.website}`}
              />
            )}
            {church.calendar_type && (
              <DetailRow icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} label="Calendar" value={church.calendar_type} />
            )}
            {church.preferred_language && (
              <DetailRow
                icon={<LanguageIcon sx={{ fontSize: 18 }} />}
                label="Language"
                value={LANGUAGE_LABELS[church.preferred_language] || church.preferred_language}
              />
            )}
            {church.timezone && (
              <DetailRow icon={<PublicIcon sx={{ fontSize: 18 }} />} label="Timezone" value={church.timezone} />
            )}
          </Box>

          {/* Record types */}
          {recordTypes.length > 0 && (
            <Box mt={2.5}>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <DescriptionIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.disabled" fontWeight={500}>
                  Active Record Types
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {recordTypes.map((rt) => (
                  <Chip key={rt} label={rt} size="small" variant="outlined" color="primary" />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Quick Actions ── */}
      {(canEditDetails || canEditBranding) && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
              Quick Actions
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {canEditDetails && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate('/account/church-details')}
                  sx={{ textTransform: 'none' }}
                >
                  Edit Church Details
                </Button>
              )}
              {canEditBranding && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PaletteIcon />}
                  onClick={() => navigate('/account/branding')}
                  sx={{ textTransform: 'none' }}
                >
                  Manage Branding
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  link?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, link }) => (
  <Box display="flex" alignItems="flex-start" gap={1}>
    <Box sx={{ color: 'text.disabled', mt: 0.25 }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.disabled" fontWeight={500}>
        {label}
      </Typography>
      {link ? (
        <Typography
          variant="body2"
          component="a"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {value}
          <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Typography>
      ) : (
        <Typography variant="body2">{value}</Typography>
      )}
    </Box>
  </Box>
);

interface AccessChipProps {
  label: string;
  allowed: boolean;
}

const AccessChip: React.FC<AccessChipProps> = ({ label, allowed }) => (
  <Tooltip title={allowed ? `You have ${label.toLowerCase()} access` : `You do not have ${label.toLowerCase()} access`}>
    <Chip
      label={label}
      size="small"
      variant="outlined"
      color={allowed ? 'success' : 'default'}
      sx={{ opacity: allowed ? 1 : 0.5 }}
    />
  </Tooltip>
);

export default AccountParishInfoPage;
