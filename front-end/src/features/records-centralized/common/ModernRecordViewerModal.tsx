/**
 * Modern Record Viewer Modal
 *
 * A redesigned modal for viewing and editing church records with:
 * - Clean two-column layout with accent-bordered sections
 * - In-modal edit mode toggle
 * - Prev/Next navigation in header
 * - Godparents/Sponsors with avatar pills
 * - Parents and birthplace display
 * - Responsive design for all devices
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Grid,
  Avatar,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Description as CertificateIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Church as ChurchIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  MenuBook as BookIcon,
} from '@mui/icons-material';

export interface ModernRecordViewerModalProps {
  open: boolean;
  onClose: () => void;
  recordType: 'baptism' | 'marriage' | 'funeral';
  record: any;
  recordIndex: number;
  recordTotal: number;
  onPrev: () => void;
  onNext: () => void;
  onEdit: (record: any) => void;
  onGenerateCertificate?: () => void;
  isDarkMode?: boolean;
  formatDate?: (date: any) => string;
  displayJsonField?: (field: any) => string;
  editFormComponent?: React.ReactNode;
  // Extended props (passed from RecordsPage)
  accentColor?: string;
  mode?: 'view' | 'edit';
  onModeChange?: (mode: 'view' | 'edit') => void;
  onSave?: () => void;
  saveLoading?: boolean;
}

// Accent-bordered section card
const SectionCard: React.FC<{
  title: string;
  icon?: React.ReactNode;
  accentColor: string;
  isDarkMode: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
}> = ({ title, icon, accentColor, isDarkMode, children }) => (
  <Paper
    elevation={0}
    sx={{
      p: 0,
      height: '100%',
      bgcolor: isDarkMode ? 'grey.800' : 'white',
      border: '1px solid',
      borderColor: isDarkMode ? 'grey.700' : 'grey.200',
      borderRadius: 2,
      borderLeft: `3px solid ${accentColor}`,
      overflow: 'hidden',
    }}
  >
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 2.5,
      pt: 2,
      pb: 1
    }}>
      {icon && (
        <Box sx={{ color: accentColor, display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
      )}
      <Typography
        variant="subtitle2"
        fontWeight="700"
        sx={{
          color: accentColor,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          fontSize: '0.7rem',
        }}
      >
        {title}
      </Typography>
    </Box>
    <Box sx={{ px: 2.5, pb: 2.5, pt: 0.5 }}>
      {children}
    </Box>
  </Paper>
);

// Field row component
const FieldRow: React.FC<{
  label: string;
  value: string | React.ReactNode;
  bold?: boolean;
}> = ({ label, value, bold }) => (
  <Box sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    py: 0.75,
    borderBottom: '1px solid',
    borderColor: 'divider',
    '&:last-child': { borderBottom: 'none' },
  }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        flexShrink: 0,
        mr: 2,
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontWeight: bold ? 600 : 400,
        textAlign: 'right',
        lineHeight: 1.4,
      }}
    >
      {value || '—'}
    </Typography>
  </Box>
);

const ModernRecordViewerModal: React.FC<ModernRecordViewerModalProps> = ({
  open,
  onClose,
  recordType,
  record,
  recordIndex,
  recordTotal,
  onPrev,
  onNext,
  onEdit,
  onGenerateCertificate,
  isDarkMode = false,
  formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—',
  displayJsonField = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field)) return field.join(', ');
    return JSON.stringify(field);
  },
  editFormComponent,
  mode: externalMode,
  onModeChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [internalMode, setInternalMode] = useState<'view' | 'edit'>('view');

  // Use external mode control if provided, otherwise internal
  const mode = externalMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;

  if (!record) return null;

  // Get person display name
  const getPersonName = () => {
    if (recordType === 'marriage') {
      const groom = `${record.fname_groom || record.groom_first || ''} ${record.lname_groom || record.groom_last || ''}`.trim();
      const bride = `${record.fname_bride || record.bride_first || ''} ${record.lname_bride || record.bride_last || ''}`.trim();
      return `${groom} & ${bride}`;
    } else if (recordType === 'funeral') {
      return `${record.deceased_first || record.firstName || ''} ${record.deceased_last || record.lastName || ''}`.trim();
    } else {
      return `${record.person_first || record.firstName || ''} ${record.person_middle || record.middleName || ''} ${record.person_last || record.lastName || ''}`.trim().replace(/\s+/g, ' ');
    }
  };

  // Get record type display name
  const getRecordTypeDisplay = () => {
    return recordType.charAt(0).toUpperCase() + recordType.slice(1) + ' Record';
  };

  // Parse godparents/sponsors into array — check all possible field names
  const getGodparents = () => {
    if (recordType !== 'baptism') return [];

    const raw = record.godparents || record.sponsors || record.godparentNames;
    if (!raw) return [];

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [raw];
      } catch {
        return raw.split(',').map((g: string) => g.trim()).filter(Boolean);
      }
    }

    if (Array.isArray(raw)) return raw;
    return [];
  };

  // Get witnesses for marriage
  const getWitnesses = () => {
    if (recordType !== 'marriage') return [];

    const raw = record.witnesses;
    if (!raw) return [];

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [raw];
      } catch {
        return raw.split(',').map((w: string) => w.trim()).filter(Boolean);
      }
    }

    if (Array.isArray(raw)) return raw;
    return [];
  };

  // Get parents
  const getParents = () => {
    if (record.parents) return record.parents;
    const father = record.father_name || record.fatherName || '';
    const mother = record.mother_name || record.motherName || '';
    if (father && mother) return `${father} & ${mother}`;
    return father || mother || '';
  };

  // Get birthplace
  const getBirthplace = () => {
    return record.place_name || record.birthplace || record.placeOfBirth || '';
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (typeof name !== 'string') return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleEditClick = () => setMode('edit');
  const handleCancelEdit = () => setMode('view');

  const handleCloseModal = () => {
    setMode('view');
    onClose();
  };

  // Section accent colors
  const colors = {
    registry: isDarkMode ? '#90caf9' : '#1976d2',
    person: isDarkMode ? '#81c784' : '#2e7d32',
    ceremony: isDarkMode ? '#ffb74d' : '#ed6c02',
    people: isDarkMode ? '#ce93d8' : '#9c27b0',
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseModal}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          minHeight: { xs: '100vh', sm: '60vh' },
          maxHeight: { xs: '100vh', sm: '90vh' },
          borderRadius: { xs: 0, sm: 3 },
          overflow: 'hidden',
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
          : 'linear-gradient(135deg, #37474f 0%, #455a64 50%, #546e7a 100%)',
        color: 'white',
        px: { xs: 2, sm: 3 },
        py: 2,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left: Type label + Name */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.7,
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: 'uppercase',
                fontSize: '0.65rem',
              }}
            >
              {getRecordTypeDisplay()}
            </Typography>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                mt: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getPersonName() || 'Unknown'}
            </Typography>
          </Box>

          {/* Right: Navigation cluster */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0, ml: 2 }}>
            <Typography
              variant="caption"
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 600,
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
                mr: 0.5,
              }}
            >
              {recordIndex + 1} / {recordTotal}
            </Typography>
            <IconButton
              onClick={onPrev}
              disabled={recordIndex <= 0}
              size="small"
              sx={{
                color: 'white',
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)' }
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={onNext}
              disabled={recordIndex >= recordTotal - 1}
              size="small"
              sx={{
                color: 'white',
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)' }
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={handleCloseModal}
              size="small"
              sx={{ color: 'white', ml: 0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{
        pt: 3,
        pb: 2,
        px: { xs: 2, sm: 3 },
        bgcolor: isDarkMode ? '#121212' : '#f5f5f5',
        overflow: 'auto',
      }}>
        {mode === 'view' ? (
          <Grid container spacing={2.5}>
            {/* Row 1: Registry + Person Info side by side */}
            <Grid item xs={12} sm={5}>
              <SectionCard
                title="Registry"
                icon={<BookIcon sx={{ fontSize: 16 }} />}
                accentColor={colors.registry}
                isDarkMode={isDarkMode}
              >
                <FieldRow label="Record ID" value={`#${record.id}`} bold />
                <FieldRow label="Book No." value={record.book_no || record.bookNumber} />
                <FieldRow label="Page No." value={record.page_no || record.pageNumber} />
                <FieldRow label="Entry No." value={record.entry_no || record.entryNumber} />
                <FieldRow label="Entry Type" value={record.entry_type || recordType} />
              </SectionCard>
            </Grid>

            <Grid item xs={12} sm={7}>
              <SectionCard
                title={recordType === 'marriage' ? 'Couple' : recordType === 'funeral' ? 'Deceased' : 'Person'}
                icon={<PersonIcon sx={{ fontSize: 16 }} />}
                accentColor={colors.person}
                isDarkMode={isDarkMode}
              >
                {recordType === 'marriage' ? (
                  <>
                    <FieldRow
                      label="Groom"
                      value={`${record.fname_groom || record.groom_first || ''} ${record.lname_groom || record.groom_last || ''}`.trim()}
                      bold
                    />
                    <FieldRow
                      label="Bride"
                      value={`${record.fname_bride || record.bride_first || ''} ${record.lname_bride || record.bride_last || ''}`.trim()}
                      bold
                    />
                  </>
                ) : recordType === 'funeral' ? (
                  <>
                    <FieldRow
                      label="Name"
                      value={`${record.deceased_first || record.firstName || ''} ${record.deceased_last || record.lastName || ''}`.trim()}
                      bold
                    />
                    <FieldRow label="Date of Death" value={formatDate(record.death_date || record.deathDate)} />
                  </>
                ) : (
                  <>
                    <FieldRow label="Full Name" value={getPersonName()} bold />
                    <FieldRow label="Date of Birth" value={formatDate(record.birth_date || record.dateOfBirth)} />
                    {getBirthplace() && (
                      <FieldRow label="Birthplace" value={getBirthplace()} />
                    )}
                    <FieldRow
                      label={recordType === 'baptism' ? 'Baptism Date' : 'Date'}
                      value={formatDate(record.baptism_date || record.dateOfBaptism)}
                    />
                    {getParents() && (
                      <FieldRow label="Parents" value={getParents()} />
                    )}
                  </>
                )}
              </SectionCard>
            </Grid>

            {/* Row 2: Ceremony Details — full width */}
            <Grid item xs={12}>
              <SectionCard
                title="Ceremony Details"
                icon={<ChurchIcon sx={{ fontSize: 16 }} />}
                accentColor={colors.ceremony}
                isDarkMode={isDarkMode}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ minWidth: 120 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      Date
                    </Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ mt: 0.25 }}>
                      {formatDate(
                        recordType === 'marriage' ? (record.marriage_date || record.marriageDate) :
                        recordType === 'funeral' ? (record.funeral_date || record.funeralDate) :
                        (record.baptism_date || record.dateOfBaptism)
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      Clergy
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {record.officiant_name || record.priest || record.clergy || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      Location
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {record.place_name || record.location || record.churchName || '—'}
                    </Typography>
                  </Box>
                  {record.address && (
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        Address
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        {record.address}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </SectionCard>
            </Grid>

            {/* Row 3: Godparents/Witnesses (if applicable) */}
            {(recordType === 'baptism' || recordType === 'marriage') && (
              <Grid item xs={12}>
                <SectionCard
                  title={recordType === 'marriage' ? 'Witnesses' : 'Godparents & Sponsors'}
                  icon={<PersonIcon sx={{ fontSize: 16 }} />}
                  accentColor={colors.people}
                  isDarkMode={isDarkMode}
                >
                  {(() => {
                    const people = recordType === 'marriage' ? getWitnesses() : getGodparents();
                    if (people.length === 0) {
                      return (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 0.5 }}>
                          No {recordType === 'marriage' ? 'witnesses' : 'sponsors'} recorded
                        </Typography>
                      );
                    }

                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
                        {people.map((person: any, index: number) => {
                          const name = typeof person === 'string' ? person : person.name || '';
                          const role = typeof person === 'object' ? person.role : undefined;

                          return (
                            <Box
                              key={index}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 2,
                                py: 1,
                                bgcolor: isDarkMode ? 'grey.700' : 'grey.100',
                                border: '1px solid',
                                borderColor: isDarkMode ? 'grey.600' : 'grey.300',
                                borderRadius: 2,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 30,
                                  height: 30,
                                  bgcolor: colors.people,
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                }}
                              >
                                {getInitials(name)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1.2 }}>
                                  {name}
                                </Typography>
                                {role && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                    {role}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })()}
                </SectionCard>
              </Grid>
            )}

            {/* Notes */}
            {record.notes && (
              <Grid item xs={12}>
                <SectionCard
                  title="Notes"
                  accentColor={isDarkMode ? '#78909c' : '#607d8b'}
                  isDarkMode={isDarkMode}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                    {record.notes}
                  </Typography>
                </SectionCard>
              </Grid>
            )}
          </Grid>
        ) : (
          // Edit Mode
          <Box>
            {editFormComponent || (
              <Paper sx={{ p: 3, bgcolor: isDarkMode ? 'grey.800' : 'white' }}>
                <Typography variant="h6" gutterBottom>Edit Mode</Typography>
                <Typography variant="body2" color="text.secondary">
                  Edit form component should be passed via editFormComponent prop
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{
        bgcolor: isDarkMode ? 'grey.900' : 'grey.100',
        borderTop: '1px solid',
        borderColor: isDarkMode ? 'grey.700' : 'grey.300',
        px: 3,
        py: 1.5,
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {mode === 'view' && onGenerateCertificate && (recordType === 'baptism' || recordType === 'marriage') && (
            <Button
              size="small"
              variant="outlined"
              onClick={onGenerateCertificate}
              startIcon={<CertificateIcon />}
              sx={{ fontWeight: 600, fontSize: '0.8rem' }}
            >
              Certificate
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {mode === 'view' ? (
            <>
              <Button
                size="small"
                onClick={handleCloseModal}
                sx={{ fontWeight: 600, color: 'text.secondary' }}
              >
                Close
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleEditClick}
                startIcon={<EditIcon />}
                sx={{
                  fontWeight: 600,
                  bgcolor: isDarkMode ? 'primary.dark' : 'primary.main',
                }}
              >
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                onClick={handleCancelEdit}
                startIcon={<CancelIcon />}
                sx={{ fontWeight: 600, color: 'text.secondary' }}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveIcon />}
                sx={{
                  fontWeight: 600,
                  bgcolor: 'success.main',
                  '&:hover': { bgcolor: 'success.dark' },
                }}
              >
                Save
              </Button>
            </>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ModernRecordViewerModal;
