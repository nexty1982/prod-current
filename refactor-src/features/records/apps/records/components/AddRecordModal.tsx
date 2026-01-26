import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
// import { useSnackbar } from 'notistack';

export type RecordTableKey = 'baptism' | 'marriage' | 'funeral';

export interface AddRecordModalProps {
  open: boolean;
  onClose: () => void;
  table: RecordTableKey;
  churchId: number;
  onCreated: () => void;
}

interface BaptismFormData {
  first_name: string;
  last_name: string;
  birth_date: string;
  reception_date: string;
  birthplace: string;
  entry_type: string;
  sponsors: string;
  parents: string;
  clergy: string;
  church_id: number;
}

interface MarriageFormData {
  mdate: string;
  fname_groom: string;
  lname_groom: string;
  parentsg: string;
  fname_bride: string;
  lname_bride: string;
  parentsb: string;
  witness: string;
  mlicense: string;
  clergy: string;
  church_id: number;
}

interface FuneralFormData {
  deceased_date: string;
  burial_date: string;
  name: string;
  lastname: string;
  age: string;
  clergy: string;
  burial_location: string;
  church_id: number;
}

export default function AddRecordModal({
  open,
  onClose,
  table,
  churchId,
  onCreated
}: AddRecordModalProps) {
  // const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data based on table type
  const [baptismData, setBaptismData] = useState<BaptismFormData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    reception_date: '',
    birthplace: '',
    entry_type: '',
    sponsors: '',
    parents: '',
    clergy: '',
    church_id: churchId
  });

  const [marriageData, setMarriageData] = useState<MarriageFormData>({
    mdate: '',
    fname_groom: '',
    lname_groom: '',
    parentsg: '',
    fname_bride: '',
    lname_bride: '',
    parentsb: '',
    witness: '',
    mlicense: '',
    clergy: '',
    church_id: churchId
  });

  const [funeralData, setFuneralData] = useState<FuneralFormData>({
    deceased_date: '',
    burial_date: '',
    name: '',
    lastname: '',
    age: '',
    clergy: '',
    burial_location: '',
    church_id: churchId
  });

  const getTableEndpoint = () => {
    switch (table) {
      case 'baptism': return '/api/baptism-records';
      case 'marriage': return '/api/marriage-records';
      case 'funeral': return '/api/funeral-records';
      default: return '';
    }
  };

  const getTableTitle = () => {
    switch (table) {
      case 'baptism': return 'Baptism Record';
      case 'marriage': return 'Marriage Record';
      case 'funeral': return 'Funeral Record';
      default: return 'Record';
    }
  };

  const validateForm = () => {
    switch (table) {
      case 'baptism':
        if (!baptismData.first_name || !baptismData.last_name || !baptismData.reception_date) {
          setError('First name, last name, and reception date are required');
          return false;
        }
        break;
      case 'marriage':
        if (!marriageData.mdate || !marriageData.fname_groom || !marriageData.lname_groom || 
            !marriageData.fname_bride || !marriageData.lname_bride) {
          setError('Marriage date, groom name, and bride name are required');
          return false;
        }
        break;
      case 'funeral':
        if (!funeralData.burial_date || !funeralData.name || !funeralData.lastname) {
          setError('Burial date, first name, and last name are required');
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = getTableEndpoint();
      let formData;

      switch (table) {
        case 'baptism':
          formData = { ...baptismData, church_id: churchId };
          break;
        case 'marriage':
          formData = { ...marriageData, church_id: churchId };
          break;
        case 'funeral':
          formData = { ...funeralData, church_id: churchId };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create record');
      }

      // enqueueSnackbar(`${getTableTitle()} created successfully`, { variant: 'success' });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create record');
      // enqueueSnackbar(err.message || 'Failed to create record', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderBaptismForm = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="First Name *"
          value={baptismData.first_name}
          onChange={(e) => setBaptismData({ ...baptismData, first_name: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Last Name *"
          value={baptismData.last_name}
          onChange={(e) => setBaptismData({ ...baptismData, last_name: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Birth Date"
          type="date"
          value={baptismData.birth_date}
          onChange={(e) => setBaptismData({ ...baptismData, birth_date: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Reception Date *"
          type="date"
          value={baptismData.reception_date}
          onChange={(e) => setBaptismData({ ...baptismData, reception_date: e.target.value })}
          required
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Birthplace"
          value={baptismData.birthplace}
          onChange={(e) => setBaptismData({ ...baptismData, birthplace: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Entry Type"
          value={baptismData.entry_type}
          onChange={(e) => setBaptismData({ ...baptismData, entry_type: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Sponsors"
          value={baptismData.sponsors}
          onChange={(e) => setBaptismData({ ...baptismData, sponsors: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Parents"
          value={baptismData.parents}
          onChange={(e) => setBaptismData({ ...baptismData, parents: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Clergy"
          value={baptismData.clergy}
          onChange={(e) => setBaptismData({ ...baptismData, clergy: e.target.value })}
        />
      </Grid>
    </Grid>
  );

  const renderMarriageForm = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Marriage Date *"
          type="date"
          value={marriageData.mdate}
          onChange={(e) => setMarriageData({ ...marriageData, mdate: e.target.value })}
          required
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="License"
          value={marriageData.mlicense}
          onChange={(e) => setMarriageData({ ...marriageData, mlicense: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Groom Information</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="First Name *"
          value={marriageData.fname_groom}
          onChange={(e) => setMarriageData({ ...marriageData, fname_groom: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Last Name *"
          value={marriageData.lname_groom}
          onChange={(e) => setMarriageData({ ...marriageData, lname_groom: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Groom's Parents"
          value={marriageData.parentsg}
          onChange={(e) => setMarriageData({ ...marriageData, parentsg: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Bride Information</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="First Name *"
          value={marriageData.fname_bride}
          onChange={(e) => setMarriageData({ ...marriageData, fname_bride: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Last Name *"
          value={marriageData.lname_bride}
          onChange={(e) => setMarriageData({ ...marriageData, lname_bride: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Bride's Parents"
          value={marriageData.parentsb}
          onChange={(e) => setMarriageData({ ...marriageData, parentsb: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Witness"
          value={marriageData.witness}
          onChange={(e) => setMarriageData({ ...marriageData, witness: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Clergy"
          value={marriageData.clergy}
          onChange={(e) => setMarriageData({ ...marriageData, clergy: e.target.value })}
        />
      </Grid>
    </Grid>
  );

  const renderFuneralForm = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="First Name *"
          value={funeralData.name}
          onChange={(e) => setFuneralData({ ...funeralData, name: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Last Name *"
          value={funeralData.lastname}
          onChange={(e) => setFuneralData({ ...funeralData, lastname: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Date of Death"
          type="date"
          value={funeralData.deceased_date}
          onChange={(e) => setFuneralData({ ...funeralData, deceased_date: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Burial Date *"
          type="date"
          value={funeralData.burial_date}
          onChange={(e) => setFuneralData({ ...funeralData, burial_date: e.target.value })}
          required
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Age"
          value={funeralData.age}
          onChange={(e) => setFuneralData({ ...funeralData, age: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Clergy"
          value={funeralData.clergy}
          onChange={(e) => setFuneralData({ ...funeralData, clergy: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Burial Location"
          value={funeralData.burial_location}
          onChange={(e) => setFuneralData({ ...funeralData, burial_location: e.target.value })}
        />
      </Grid>
    </Grid>
  );

  const renderForm = () => {
    switch (table) {
      case 'baptism':
        return renderBaptismForm();
      case 'marriage':
        return renderMarriageForm();
      case 'funeral':
        return renderFuneralForm();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Add {getTableTitle()}</Typography>
          <Button onClick={onClose} size="small">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mt: 2 }}>
          {renderForm()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Creating...' : 'Create Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
