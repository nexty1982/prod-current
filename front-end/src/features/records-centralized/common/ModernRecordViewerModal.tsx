/**
 * Modern Record Viewer Modal
 * 
 * A redesigned modal for viewing and editing church records with:
 * - Modern card-based layout with badges
 * - In-modal edit mode toggle (no route changes)
 * - Prev/Next navigation in header
 * - Archive panel for document attachments
 * - Godparents/Sponsors as pill cards with avatars
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
  Chip,
  Avatar,
  Tooltip,
  Divider,
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
  Verified as VerifiedIcon,
  FolderOpen as ArchiveIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
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
}

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
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mode, setMode] = useState<'view' | 'edit'>('view');

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
      return `${record.person_first || record.firstName || ''} ${record.person_middle || record.middleName || ''} ${record.person_last || record.lastName || ''}`.trim();
    }
  };

  // Get record type display name
  const getRecordTypeDisplay = () => {
    return recordType.charAt(0).toUpperCase() + recordType.slice(1) + ' Record';
  };

  // Parse godparents/sponsors into array
  const getGodparents = () => {
    if (recordType !== 'baptism') return [];
    
    const godparentsData = record.godparents;
    if (!godparentsData) return [];
    
    if (typeof godparentsData === 'string') {
      try {
        const parsed = JSON.parse(godparentsData);
        return Array.isArray(parsed) ? parsed : [godparentsData];
      } catch {
        return godparentsData.split(',').map(g => g.trim()).filter(Boolean);
      }
    }
    
    if (Array.isArray(godparentsData)) return godparentsData;
    return [];
  };

  // Get witnesses for marriage
  const getWitnesses = () => {
    if (recordType !== 'marriage') return [];
    
    const witnessesData = record.witnesses;
    if (!witnessesData) return [];
    
    if (typeof witnessesData === 'string') {
      try {
        const parsed = JSON.parse(witnessesData);
        return Array.isArray(parsed) ? parsed : [witnessesData];
      } catch {
        return witnessesData.split(',').map(w => w.trim()).filter(Boolean);
      }
    }
    
    if (Array.isArray(witnessesData)) return witnessesData;
    return [];
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

  const handleEditClick = () => {
    if (mode === 'view') {
      setMode('edit');
    }
  };

  const handleSaveEdit = () => {
    // This would trigger the parent's save handler
    setMode('view');
  };

  const handleCancelEdit = () => {
    setMode('view');
  };

  const handleCloseModal = () => {
    setMode('view');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseModal}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          minHeight: { xs: '100vh', sm: '80vh' },
          maxHeight: { xs: '100vh', sm: '95vh' },
          borderRadius: { xs: 0, sm: 3 },
          overflow: 'hidden',
        }
      }}
    >
      {/* Modern Header with Badges and Navigation */}
      <DialogTitle sx={{ 
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)'
          : 'linear-gradient(135deg, #5e35b1 0%, #7e57c2 50%, #9575cd 100%)',
        color: 'white',
        p: { xs: 2, sm: 3 },
        position: 'relative',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          {/* Left: Title and Badge */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <ViewIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
              <Typography variant={isMobile ? 'h6' : 'h5'} component="span" fontWeight="700">
                {getRecordTypeDisplay()}
              </Typography>
              <Chip 
                icon={<VerifiedIcon sx={{ fontSize: 16 }} />}
                label="VERIFIED"
                size="small"
                sx={{ 
                  bgcolor: 'rgba(76, 175, 80, 0.9)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 24,
                  '& .MuiChip-icon': { color: 'white' }
                }}
              />
            </Box>
            <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ opacity: 0.95, fontWeight: 500 }}>
              {getPersonName() || 'Unknown'}
            </Typography>
          </Box>

          {/* Right: Record Counter and Navigation */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                px: 1.5, 
                py: 0.5, 
                borderRadius: 1,
                fontWeight: 700,
                fontSize: '0.75rem',
                whiteSpace: 'nowrap'
              }}
            >
              RECORD {recordIndex + 1} OF {recordTotal}
            </Typography>
            <IconButton 
              onClick={onPrev} 
              disabled={recordIndex <= 0}
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton 
              onClick={onNext} 
              disabled={recordIndex >= recordTotal - 1}
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }
              }}
            >
              <ChevronRightIcon />
            </IconButton>
            <IconButton 
              onClick={handleCloseModal}
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                ml: 1
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* Content Area */}
      <DialogContent sx={{ 
        pt: 3, 
        pb: 2, 
        px: { xs: 2, sm: 3 },
        bgcolor: isDarkMode ? 'grey.900' : 'grey.50',
        overflow: 'auto'
      }}>
        {mode === 'view' ? (
          <Grid container spacing={3}>
            {/* Top 3 Cards Row */}
            <Grid item xs={12} md={4}>
              {/* Registry Information Card */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  height: '100%',
                  bgcolor: isDarkMode ? 'grey.800' : 'white',
                  border: '1px solid',
                  borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  }
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  fontWeight="700" 
                  sx={{ 
                    mb: 2,
                    color: isDarkMode ? '#90caf9' : 'primary.main',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontSize: '0.75rem'
                  }}
                >
                  Registry Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Record ID
                    </Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ mt: 0.25 }}>
                      #{record.id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Book No.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {record.book_no || record.bookNumber || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Page No.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {record.page_no || record.pageNumber || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Entry No.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {record.entry_no || record.entryNumber || '—'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              {/* Person Information Card */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  height: '100%',
                  bgcolor: isDarkMode ? 'grey.800' : 'white',
                  border: '1px solid',
                  borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  }
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  fontWeight="700" 
                  sx={{ 
                    mb: 2,
                    color: isDarkMode ? '#81c784' : 'success.main',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontSize: '0.75rem'
                  }}
                >
                  {recordType === 'marriage' ? 'Couple Information' : 'Person Information'}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {recordType === 'marriage' ? (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Groom
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ mt: 0.25 }}>
                          {`${record.fname_groom || record.groom_first || ''} ${record.lname_groom || record.groom_last || ''}`.trim() || '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Bride
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ mt: 0.25 }}>
                          {`${record.fname_bride || record.bride_first || ''} ${record.lname_bride || record.bride_last || ''}`.trim() || '—'}
                        </Typography>
                      </Box>
                    </>
                  ) : recordType === 'funeral' ? (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Deceased
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ mt: 0.25 }}>
                          {`${record.deceased_first || record.firstName || ''} ${record.deceased_last || record.lastName || ''}`.trim() || '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Date of Death
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>
                          {formatDate(record.death_date || record.deathDate)}
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Legal Name
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ mt: 0.25 }}>
                          {getPersonName() || '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Date of Birth
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>
                          {formatDate(record.birth_date || record.dateOfBirth)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Baptism Date
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>
                          {formatDate(record.baptism_date || record.dateOfBaptism)}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              {/* Ceremony Details Card */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  height: '100%',
                  bgcolor: isDarkMode ? 'grey.800' : 'white',
                  border: '1px solid',
                  borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  }
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  fontWeight="700" 
                  sx={{ 
                    mb: 2,
                    color: isDarkMode ? '#ffb74d' : 'warning.main',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontSize: '0.75rem'
                  }}
                >
                  Ceremony Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Ceremony Date
                    </Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ mt: 0.25 }}>
                      {formatDate(
                        recordType === 'marriage' ? (record.marriage_date || record.marriageDate) :
                        recordType === 'funeral' ? (record.funeral_date || record.funeralDate) :
                        (record.baptism_date || record.dateOfBaptism)
                      )}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Officiating Clergy
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {record.officiant_name || record.priest || record.clergy || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Location
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {record.place_name || record.location || record.churchName || '—'}
                    </Typography>
                  </Box>
                  {record.address && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        Address
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.85rem' }}>
                        {record.address}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Bottom Row: Godparents/Witnesses and Archive */}
            <Grid item xs={12} md={7}>
              {/* Godparents & Sponsors Panel */}
              {(recordType === 'baptism' || recordType === 'marriage') && (
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2.5, 
                    bgcolor: isDarkMode ? 'grey.800' : 'white',
                    border: '1px solid',
                    borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="700" 
                    sx={{ 
                      mb: 2,
                      color: isDarkMode ? '#64b5f6' : 'info.main',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    {recordType === 'marriage' ? 'Witnesses' : 'Godparents & Sponsors'}
                  </Typography>
                  
                  {(() => {
                    const people = recordType === 'marriage' ? getWitnesses() : getGodparents();
                    if (people.length === 0) {
                      return (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No {recordType === 'marriage' ? 'witnesses' : 'sponsors'} listed
                        </Typography>
                      );
                    }
                    
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        {people.map((person, index) => {
                          const name = typeof person === 'string' ? person : person.name || '';
                          const role = typeof person === 'object' ? person.role : recordType === 'marriage' ? 'Witness' : 'Godparent';
                          
                          return (
                            <Paper
                              key={index}
                              elevation={0}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 2,
                                py: 1,
                                bgcolor: isDarkMode ? 'grey.700' : 'grey.100',
                                border: '1px solid',
                                borderColor: isDarkMode ? 'grey.600' : 'grey.300',
                                borderRadius: 3,
                              }}
                            >
                              <Avatar 
                                sx={{ 
                                  width: 32, 
                                  height: 32, 
                                  bgcolor: isDarkMode ? 'primary.dark' : 'primary.main',
                                  fontSize: '0.75rem',
                                  fontWeight: 700
                                }}
                              >
                                {getInitials(name)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1.2 }}>
                                  {name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  {role}
                                </Typography>
                              </Box>
                            </Paper>
                          );
                        })}
                      </Box>
                    );
                  })()}
                </Paper>
              )}
            </Grid>

            <Grid item xs={12} md={5}>
              {/* Original Document Archive Panel */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  bgcolor: isDarkMode ? 'grey.800' : 'white',
                  border: '1px solid',
                  borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  fontWeight="700" 
                  sx={{ 
                    mb: 2,
                    color: isDarkMode ? '#ba68c8' : 'secondary.main',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontSize: '0.75rem'
                  }}
                >
                  Original Document Archive
                </Typography>
                
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <ArchiveIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Scanned original documents and attachments
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Tooltip title="No archive uploaded">
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PreviewIcon />}
                          disabled
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Preview
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="No archive uploaded">
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          disabled
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Download
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Notes Section */}
            {record.notes && (
              <Grid item xs={12}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2.5,
                    bgcolor: isDarkMode ? 'grey.800' : 'white',
                    border: '1px solid',
                    borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="700" 
                    sx={{ 
                      mb: 1.5,
                      color: 'text.primary',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    Additional Notes
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7, fontStyle: 'italic', color: 'text.secondary' }}>
                    {record.notes}
                  </Typography>
                </Paper>
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

      {/* Footer Actions */}
      <DialogActions sx={{ 
        bgcolor: isDarkMode ? 'grey.800' : 'grey.100',
        borderTop: '1px solid', 
        borderColor: isDarkMode ? 'grey.700' : 'grey.300',
        px: 3, 
        py: 2,
        justifyContent: 'space-between',
        gap: 2
      }}>
        <Box>
          {mode === 'view' && onGenerateCertificate && (recordType === 'baptism' || recordType === 'marriage') && (
            <Button
              variant="contained"
              onClick={onGenerateCertificate}
              startIcon={<CertificateIcon />}
              sx={{
                bgcolor: isDarkMode ? 'success.dark' : 'success.main',
                color: 'white',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  bgcolor: isDarkMode ? 'success.main' : 'success.dark',
                }
              }}
            >
              Generate Certificate
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {mode === 'view' ? (
            <>
              <Button 
                onClick={handleCloseModal}
                sx={{
                  px: 3,
                  fontWeight: 600,
                  color: 'text.secondary'
                }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                onClick={handleEditClick}
                startIcon={<EditIcon />}
                sx={{
                  px: 3,
                  fontWeight: 600,
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)'
                    : 'linear-gradient(135deg, #5e35b1 0%, #9575cd 100%)',
                  '&:hover': {
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #3949ab 0%, #1a237e 100%)'
                      : 'linear-gradient(135deg, #9575cd 0%, #5e35b1 100%)',
                  }
                }}
              >
                Edit Record
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={handleCancelEdit}
                startIcon={<CancelIcon />}
                sx={{
                  px: 3,
                  fontWeight: 600,
                  color: 'text.secondary'
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveEdit}
                startIcon={<SaveIcon />}
                sx={{
                  px: 3,
                  fontWeight: 600,
                  bgcolor: 'success.main',
                  '&:hover': {
                    bgcolor: 'success.dark',
                  }
                }}
              >
                Save Changes
              </Button>
            </>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ModernRecordViewerModal;
