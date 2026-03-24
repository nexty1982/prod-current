import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import {
  IconCheck, IconBuilding, IconMapPin, IconChevronRight,
  IconChevronLeft, IconCalendar, IconClock, IconUser,
} from '@tabler/icons-react';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';

// ── State map ──────────────────────────────────────────────────
const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
  LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
  MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

const HEARD_ABOUT_OPTIONS = [
  { value: 'internet_search', label: 'Internet Search' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'conference', label: 'Conference / Event' },
  { value: 'diocese', label: 'Diocese / Jurisdiction' },
  { value: 'other', label: 'Other' },
];

const ROLE_OPTIONS = [
  { value: 'priest', label: 'Priest / Presbyter' },
  { value: 'deacon', label: 'Deacon' },
  { value: 'church_admin', label: 'Church Administrator' },
  { value: 'council_member', label: 'Parish Council Member' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'other', label: 'Other' },
];

interface CrmChurch {
  id: number;
  name: string;
  city: string;
  state_code: string;
  jurisdiction: string;
}

interface AvailableDate {
  date: string;
  slotsRemaining: number;
}

interface TimeSlot {
  time: string;
  duration: number;
  display: string;
}

interface AuthRegisterProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const STEPS = ['Find Your Parish', 'Tell Us About You', 'Schedule a Meeting'];

const AuthRegister = ({ title, subtitle, subtext }: AuthRegisterProps) => {
  const theme = useTheme();
  const [searchParams] = useSearchParams();

  // Wizard step
  const [activeStep, setActiveStep] = useState(0);

  // Step 0: Locate parish
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [churches, setChurches] = useState<CrmChurch[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<CrmChurch | null>(null);
  const [searching, setSearching] = useState(false);
  const [churchNotListed, setChurchNotListed] = useState(false);
  const [manualChurchName, setManualChurchName] = useState('');

  // Step 1: About you
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [maintainsRecords, setMaintainsRecords] = useState('');
  const [heardAbout, setHeardAbout] = useState('');
  const [heardAboutDetail, setHeardAboutDetail] = useState('');
  const [interestedDigital, setInterestedDigital] = useState('');
  const [wantsMeeting, setWantsMeeting] = useState('');

  // Step 2: Schedule
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Shared
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  // Auto-fill from URL params
  useEffect(() => {
    const token = searchParams.get('token');
    const church = searchParams.get('church');
    if (token && church) {
      // Old token-based registration → redirect to dedicated page
      window.location.href = `/auth/register-token?token=${token}&church=${encodeURIComponent(church)}`;
    }
  }, [searchParams]);

  // Load states
  useEffect(() => {
    fetch('/api/auth/church-search/states')
      .then(r => r.json())
      .then(data => { if (data.success) setStates(data.states); })
      .catch(() => {});
  }, []);

  // Search churches
  const searchChurches = useCallback(async (state: string, q: string) => {
    if (!state) { setChurches([]); return; }
    setSearching(true);
    try {
      const params = new URLSearchParams({ state });
      if (q.trim().length >= 2) params.set('q', q.trim());
      const res = await fetch(`/api/auth/church-search?${params}`);
      const data = await res.json();
      if (data.success) setChurches(data.churches);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    if (!selectedState) return;
    const timer = setTimeout(() => searchChurches(selectedState, searchQuery), 300);
    return () => clearTimeout(timer);
  }, [selectedState, searchQuery, searchChurches]);

  useEffect(() => {
    if (selectedState) {
      searchChurches(selectedState, '');
      setSearchQuery('');
      setSelectedChurch(null);
      setChurchNotListed(false);
    }
  }, [selectedState, searchChurches]);

  // Load available dates for calendar
  const loadAvailableDates = useCallback(async (month: string) => {
    setLoadingDates(true);
    try {
      const res = await fetch(`/api/crm-public/available-dates?month=${month}`);
      const data = await res.json();
      if (data.success) setAvailableDates(data.dates);
    } catch { /* ignore */ }
    finally { setLoadingDates(false); }
  }, []);

  useEffect(() => {
    if (activeStep === 2 && wantsMeeting === 'yes') {
      loadAvailableDates(calendarMonth);
    }
  }, [activeStep, calendarMonth, wantsMeeting, loadAvailableDates]);

  // Load time slots when date selected
  useEffect(() => {
    if (!selectedDate) { setTimeSlots([]); return; }
    setLoadingSlots(true);
    setSelectedTime('');
    fetch(`/api/crm-public/available-slots?date=${selectedDate}`)
      .then(r => r.json())
      .then(data => { if (data.success) setTimeSlots(data.slots); })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  // Derived
  const churchName = selectedChurch ? selectedChurch.name : manualChurchName;
  const canProceedStep0 = (selectedChurch !== null || (churchNotListed && manualChurchName.trim().length > 0));
  const canProceedStep1 = firstName.trim() && email.trim() && role && maintainsRecords && interestedDigital && wantsMeeting;
  const showScheduleStep = wantsMeeting === 'yes';
  const canSubmit = showScheduleStep ? (selectedDate && selectedTime) : true;

  // Calendar month navigation
  const calendarMonthLabel = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarMonth]);

  const navigateMonth = (dir: number) => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDate('');
    setSelectedTime('');
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const availSet = new Set(availableDates.map(d => d.date));

    const days: { day: number; dateStr: string; available: boolean }[] = [];
    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) days.push({ day: 0, dateStr: '', available: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, available: availSet.has(dateStr) });
    }
    return days;
  }, [calendarMonth, availableDates]);

  const handleNext = () => {
    setError('');
    // If step 1 and wantsMeeting is 'no', skip step 2 and submit
    if (activeStep === 1 && wantsMeeting !== 'yes') {
      handleSubmit();
      return;
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/crm-public/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchId: selectedChurch?.id || null,
          churchName: churchName.trim(),
          stateCode: selectedState || null,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role,
          maintainsRecords,
          heardAbout,
          heardAboutDetail: heardAboutDetail.trim() || null,
          interestedDigitalRecords: interestedDigital,
          wantsMeeting: wantsMeeting === 'yes',
          appointmentDate: selectedDate || null,
          appointmentTime: selectedTime || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Submission failed. Please try again.');
        return;
      }
      setResultMessage(data.message);
      setSuccess(true);
    } catch {
      setError('Network error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ──────────────────────────────────────────────────
  if (success) {
    return (
      <Box textAlign="center" py={3}>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'success.light', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
          <IconCheck size={32} color="#2e7d32" />
        </Box>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Thank You!
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          {resultMessage || 'Your inquiry has been submitted. We will be in touch soon.'}
        </Typography>
        {selectedDate && selectedTime && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'inline-block' }}>
            <Typography variant="body2" fontWeight={600}>
              <IconCalendar size={16} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
              Meeting Scheduled
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {' at '}
              {timeSlots.find(s => s.time === selectedTime)?.display || selectedTime}
              {' (Eastern)'}
            </Typography>
          </Paper>
        )}
        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">
            Already have an account?{' '}
            <Typography component={Link} to="/auth/login" color="primary.main" fontWeight={500} sx={{ textDecoration: 'none' }}>
              Sign In
            </Typography>
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Effective steps (remove step 2 if no meeting wanted) ────
  const effectiveSteps = showScheduleStep || activeStep < 2
    ? STEPS
    : STEPS.slice(0, 2);

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h3" mb={1}>{title}</Typography>
      ) : null}
      {subtext}

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}>
        {effectiveSteps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {/* ── Step 0: Find Your Parish ────────────────────────── */}
      {activeStep === 0 && (
        <Box>
          <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, p: 2.5, mb: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}` }}>
            <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 600 }}>
              <IconMapPin size={18} /> Locate Your Parish
            </Typography>

            <CustomFormLabel htmlFor="stateSelect">State</CustomFormLabel>
            <CustomTextField
              id="stateSelect"
              select
              fullWidth
              variant="outlined"
              size="small"
              value={selectedState}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedState(e.target.value)}
            >
              <MenuItem value="" disabled>Select your state...</MenuItem>
              {states.map(code => (
                <MenuItem key={code} value={code}>{STATE_NAMES[code] || code}</MenuItem>
              ))}
            </CustomTextField>

            {selectedState && (
              <>
                <CustomFormLabel htmlFor="churchSearch">Parish Name</CustomFormLabel>
                <Autocomplete
                  freeSolo
                  options={churches}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                  value={selectedChurch}
                  inputValue={searchQuery}
                  onInputChange={(_e, value) => setSearchQuery(value)}
                  onChange={(_e, value) => {
                    if (typeof value === 'object' && value !== null) {
                      setSelectedChurch(value);
                      setChurchNotListed(false);
                    } else {
                      setSelectedChurch(null);
                    }
                  }}
                  loading={searching}
                  noOptionsText="No churches found — try a different spelling"
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{option.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {option.city}, {option.state_code} &bull; {option.jurisdiction}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      id="churchSearch"
                      placeholder="Start typing your parish name..."
                      variant="outlined"
                      size="small"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {searching ? <CircularProgress size={16} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </>
            )}

            {selectedChurch && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: alpha('#2e7d32', 0.08), borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid', borderColor: alpha('#2e7d32', 0.25) }}>
                <IconCheck size={18} color="#2e7d32" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>{selectedChurch.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {selectedChurch.city}, {selectedChurch.state_code} &bull; {selectedChurch.jurisdiction}
                  </Typography>
                </Box>
              </Box>
            )}

            {selectedState && !selectedChurch && (
              <Box sx={{ mt: 2 }}>
                <Button
                  size="small"
                  variant={churchNotListed ? 'outlined' : 'text'}
                  color={churchNotListed ? 'warning' : 'inherit'}
                  onClick={() => setChurchNotListed(!churchNotListed)}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  {churchNotListed ? "My church isn't listed (selected)" : "I don't see my church"}
                </Button>
                {churchNotListed && (
                  <Box mt={1}>
                    <CustomTextField
                      size="small"
                      fullWidth
                      variant="outlined"
                      placeholder="Enter your parish name"
                      value={manualChurchName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualChurchName(e.target.value)}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Button variant="contained" fullWidth disabled={!canProceedStep0} onClick={handleNext}
            endIcon={<IconChevronRight size={18} />}
            sx={{ '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.600' } }}>
            Continue
          </Button>
        </Box>
      )}

      {/* ── Step 1: Tell Us About You ───────────────────────── */}
      {activeStep === 1 && (
        <Box>
          <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, p: 2.5, mb: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}` }}>
            <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 600 }}>
              <IconUser size={18} /> Your Information
            </Typography>

            <Stack direction="row" spacing={1.5}>
              <Box flex={1}>
                <CustomFormLabel htmlFor="firstName">First Name *</CustomFormLabel>
                <CustomTextField id="firstName" size="small" fullWidth variant="outlined"
                  value={firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} />
              </Box>
              <Box flex={1}>
                <CustomFormLabel htmlFor="lastName">Last Name</CustomFormLabel>
                <CustomTextField id="lastName" size="small" fullWidth variant="outlined"
                  value={lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} />
              </Box>
            </Stack>

            <CustomFormLabel htmlFor="email">Email Address *</CustomFormLabel>
            <CustomTextField id="email" type="email" size="small" fullWidth variant="outlined" placeholder="your.email@example.com"
              value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />

            <CustomFormLabel htmlFor="phone">Phone (optional)</CustomFormLabel>
            <CustomTextField id="phone" type="tel" size="small" fullWidth variant="outlined" placeholder="(555) 123-4567"
              value={phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} />

            <CustomFormLabel htmlFor="role">Your Role *</CustomFormLabel>
            <CustomTextField id="role" select size="small" fullWidth variant="outlined"
              value={role} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRole(e.target.value)}>
              <MenuItem value="" disabled>Select your role...</MenuItem>
              {ROLE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </CustomTextField>
          </Box>

          <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.04), borderRadius: 2, p: 2.5, mb: 2, border: `1px solid ${alpha(theme.palette.info.main, 0.12)}` }}>
            <Typography variant="subtitle2" color="info.main" sx={{ mb: 2, fontWeight: 600 }}>
              A Few Questions
            </Typography>

            <FormControl component="fieldset" sx={{ mb: 2, display: 'block' }}>
              <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Does your parish currently maintain church records (baptism, marriage, funeral)?
              </FormLabel>
              <RadioGroup row value={maintainsRecords} onChange={(e) => setMaintainsRecords(e.target.value)}>
                <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
                <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                <FormControlLabel value="unsure" control={<Radio size="small" />} label="Not sure" />
              </RadioGroup>
            </FormControl>

            <FormControl component="fieldset" sx={{ mb: 2, display: 'block' }}>
              <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Are you interested in digital church records?
              </FormLabel>
              <RadioGroup row value={interestedDigital} onChange={(e) => setInterestedDigital(e.target.value)}>
                <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
                <FormControlLabel value="no" control={<Radio size="small" />} label="Not right now" />
                <FormControlLabel value="maybe" control={<Radio size="small" />} label="Maybe" />
              </RadioGroup>
            </FormControl>

            <CustomFormLabel htmlFor="heardAbout">How did you hear about Orthodox Metrics?</CustomFormLabel>
            <CustomTextField id="heardAbout" select size="small" fullWidth variant="outlined"
              value={heardAbout} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHeardAbout(e.target.value)}>
              <MenuItem value="" disabled>Select...</MenuItem>
              {HEARD_ABOUT_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </CustomTextField>
            {heardAbout === 'other' && (
              <CustomTextField size="small" fullWidth variant="outlined" placeholder="Please specify..."
                sx={{ mt: 1 }}
                value={heardAboutDetail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHeardAboutDetail(e.target.value)} />
            )}

            <FormControl component="fieldset" sx={{ mt: 2, display: 'block' }}>
              <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Would you like to schedule a short introductory meeting?
              </FormLabel>
              <RadioGroup row value={wantsMeeting} onChange={(e) => setWantsMeeting(e.target.value)}>
                <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes, please" />
                <FormControlLabel value="no" control={<Radio size="small" />} label="Not right now" />
              </RadioGroup>
            </FormControl>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleBack} startIcon={<IconChevronLeft size={18} />} sx={{ flex: 1 }}>
              Back
            </Button>
            <Button variant="contained" disabled={!canProceedStep1} onClick={handleNext}
              endIcon={<IconChevronRight size={18} />} sx={{ flex: 1, '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.600' } }}>
              {showScheduleStep ? 'Pick a Time' : 'Submit'}
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Step 2: Schedule a Meeting ──────────────────────── */}
      {activeStep === 2 && (
        <Box>
          <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, p: 2.5, mb: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}` }}>
            <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 600 }}>
              <IconCalendar size={18} /> Pick a Date & Time
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Select an available date, then choose a time slot. All times are Eastern Time (ET).
            </Typography>

            {/* Month navigation */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <IconButton size="small" onClick={() => navigateMonth(-1)}>
                <IconChevronLeft size={18} />
              </IconButton>
              <Typography variant="subtitle2" fontWeight={600}>{calendarMonthLabel}</Typography>
              <IconButton size="small" onClick={() => navigateMonth(1)}>
                <IconChevronRight size={18} />
              </IconButton>
            </Stack>

            {/* Day-of-week headers */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Typography key={d} variant="caption" textAlign="center" color="textSecondary" fontWeight={600}>
                  {d}
                </Typography>
              ))}
            </Box>

            {/* Calendar grid */}
            {loadingDates ? (
              <Box textAlign="center" py={3}><CircularProgress size={24} /></Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {calendarDays.map((d, i) => (
                  <Box key={i}>
                    {d.day === 0 ? <Box sx={{ height: 36 }} /> : (
                      <Button
                        size="small"
                        variant={selectedDate === d.dateStr ? 'contained' : 'text'}
                        disabled={!d.available}
                        onClick={() => { setSelectedDate(d.dateStr); setSelectedTime(''); }}
                        sx={{
                          minWidth: 0, width: '100%', height: 36, fontSize: '0.8rem',
                          borderRadius: 1,
                          ...(d.available && selectedDate !== d.dateStr ? { bgcolor: alpha(theme.palette.success.main, 0.08), color: 'success.dark' } : {}),
                        }}
                      >
                        {d.day}
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {/* Time slots */}
            {selectedDate && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconClock size={16} />
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Typography>
                {loadingSlots ? (
                  <Box textAlign="center" py={2}><CircularProgress size={20} /></Box>
                ) : timeSlots.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">No available slots on this date.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {timeSlots.map(slot => (
                      <Chip
                        key={slot.time}
                        label={slot.display}
                        clickable
                        variant={selectedTime === slot.time ? 'filled' : 'outlined'}
                        color={selectedTime === slot.time ? 'primary' : 'default'}
                        onClick={() => setSelectedTime(slot.time)}
                        sx={{ fontWeight: selectedTime === slot.time ? 600 : 400 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleBack} startIcon={<IconChevronLeft size={18} />} sx={{ flex: 1 }}>
              Back
            </Button>
            <Button
              variant="contained"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              sx={{ flex: 1, '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.600' } }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit & Book Meeting'}
            </Button>
          </Stack>
        </Box>
      )}

      {subtitle}
    </>
  );
};

export default AuthRegister;
