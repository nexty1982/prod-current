import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  OutlinedInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted';
  source: string;
  value: number;
  createdAt: string;
}

const statusColors: Record<Lead['status'], 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  New: 'info',
  Contacted: 'warning',
  Qualified: 'success',
  Unqualified: 'error',
  Converted: 'default',
};

const initialLeads: Lead[] = [
  { id: 1, name: 'Robert Fox', email: 'robert@company.com', phone: '+1 555-0101', company: 'Tech Corp', status: 'New', source: 'Website', value: 5000, createdAt: '2026-02-10' },
  { id: 2, name: 'Eleanor Pena', email: 'eleanor@startup.io', phone: '+1 555-0102', company: 'StartUp IO', status: 'Contacted', source: 'Referral', value: 12000, createdAt: '2026-02-08' },
  { id: 3, name: 'Devon Lane', email: 'devon@global.net', phone: '+1 555-0103', company: 'Global Net', status: 'Qualified', source: 'LinkedIn', value: 25000, createdAt: '2026-02-05' },
  { id: 4, name: 'Theresa Webb', email: 'theresa@design.co', phone: '+1 555-0104', company: 'Design Co', status: 'Unqualified', source: 'Cold Call', value: 3000, createdAt: '2026-02-03' },
  { id: 5, name: 'Jenny Wilson', email: 'jenny@media.org', phone: '+1 555-0105', company: 'Media Org', status: 'Converted', source: 'Trade Show', value: 45000, createdAt: '2026-01-28' },
  { id: 6, name: 'Guy Hawkins', email: 'guy@solutions.biz', phone: '+1 555-0106', company: 'Solutions Biz', status: 'New', source: 'Website', value: 8000, createdAt: '2026-02-12' },
  { id: 7, name: 'Kristin Watson', email: 'kristin@innov.tech', phone: '+1 555-0107', company: 'Innov Tech', status: 'Contacted', source: 'Email Campaign', value: 15000, createdAt: '2026-02-11' },
  { id: 8, name: 'Floyd Miles', email: 'floyd@enterprise.com', phone: '+1 555-0108', company: 'Enterprise Inc', status: 'Qualified', source: 'Referral', value: 60000, createdAt: '2026-02-01' },
];

let nextId = 100;

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Berry Components' },
  { title: 'CRM' },
  { title: 'Lead Management' },
];

interface BerryLeadManagementPageProps { embedded?: boolean; }

export default function BerryLeadManagementPage({ embedded }: BerryLeadManagementPageProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formStatus, setFormStatus] = useState<Lead['status']>('New');
  const [formSource, setFormSource] = useState('');
  const [formValue, setFormValue] = useState('');

  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const openNew = () => {
    setEditingLead(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCompany('');
    setFormStatus('New');
    setFormSource('');
    setFormValue('');
    setDialogOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormName(lead.name);
    setFormEmail(lead.email);
    setFormPhone(lead.phone);
    setFormCompany(lead.company);
    setFormStatus(lead.status);
    setFormSource(lead.source);
    setFormValue(String(lead.value));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    if (editingLead) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === editingLead.id
            ? { ...l, name: formName, email: formEmail, phone: formPhone, company: formCompany, status: formStatus, source: formSource, value: Number(formValue) || 0 }
            : l
        )
      );
    } else {
      setLeads((prev) => [
        ...prev,
        {
          id: nextId++,
          name: formName,
          email: formEmail,
          phone: formPhone,
          company: formCompany,
          status: formStatus,
          source: formSource,
          value: Number(formValue) || 0,
          createdAt: new Date().toISOString().split('T')[0],
        },
      ]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const content = (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <OutlinedInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search leads..."
              startAdornment={<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>}
              size="small"
              sx={{ width: { xs: '100%', sm: 300 } }}
            />
            <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openNew}>
              Add Lead
            </Button>
          </Stack>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((lead) => (
                    <TableRow key={lead.id} hover>
                      <TableCell>{lead.name}</TableCell>
                      <TableCell>{lead.company}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell>
                        <Chip label={lead.status} color={statusColors[lead.status]} size="small" />
                      </TableCell>
                      <TableCell>{lead.source}</TableCell>
                      <TableCell align="right">${lead.value.toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => openEdit(lead)}><IconEdit size={18} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(lead.id)}><IconTrash size={18} /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} fullWidth autoFocus />
            <TextField label="Email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} fullWidth />
            <Grid container spacing={2}>
              <Grid size={6}><TextField label="Phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} fullWidth /></Grid>
              <Grid size={6}><TextField label="Company" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} fullWidth /></Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={4}>
                <TextField select label="Status" value={formStatus} onChange={(e) => setFormStatus(e.target.value as Lead['status'])} fullWidth>
                  {(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted'] as const).map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={4}><TextField label="Source" value={formSource} onChange={(e) => setFormSource(e.target.value)} fullWidth /></Grid>
              <Grid size={4}><TextField label="Value ($)" value={formValue} onChange={(e) => setFormValue(e.target.value)} fullWidth type="number" /></Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formName.trim()}>
            {editingLead ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  if (embedded) return content;

  return (
    <PageContainer title="Lead Management" description="Berry CRM - Lead Management">
      <Breadcrumb title="Lead Management" items={BCrumb} />
      {content}
    </PageContainer>
  );
}
