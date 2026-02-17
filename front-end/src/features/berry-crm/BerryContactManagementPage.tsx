import React, { useState, useMemo } from 'react';
import {
  Avatar,
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
import { IconEdit, IconMail, IconPhone, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  type: 'Customer' | 'Partner' | 'Vendor' | 'Employee';
  location: string;
  lastActivity: string;
}

const typeColors: Record<Contact['type'], 'primary' | 'success' | 'warning' | 'info'> = {
  Customer: 'primary',
  Partner: 'success',
  Vendor: 'warning',
  Employee: 'info',
};

const initialContacts: Contact[] = [
  { id: 1, name: 'Alex Thompson', email: 'alex@tech.com', phone: '+1 555-1001', company: 'TechVentures', role: 'CEO', type: 'Customer', location: 'San Francisco, CA', lastActivity: '2026-02-15' },
  { id: 2, name: 'Maria Garcia', email: 'maria@design.co', phone: '+1 555-1002', company: 'DesignWorks', role: 'Creative Director', type: 'Partner', location: 'Austin, TX', lastActivity: '2026-02-14' },
  { id: 3, name: 'James Wilson', email: 'james@supply.net', phone: '+1 555-1003', company: 'SupplyChain Pro', role: 'Account Manager', type: 'Vendor', location: 'Chicago, IL', lastActivity: '2026-02-12' },
  { id: 4, name: 'Sarah Johnson', email: 'sarah@internal.com', phone: '+1 555-1004', company: 'OrthodoxMetrics', role: 'Engineer', type: 'Employee', location: 'New York, NY', lastActivity: '2026-02-16' },
  { id: 5, name: 'Michael Brown', email: 'michael@invest.co', phone: '+1 555-1005', company: 'InvestCo', role: 'CTO', type: 'Customer', location: 'Seattle, WA', lastActivity: '2026-02-10' },
  { id: 6, name: 'Emma Davis', email: 'emma@media.org', phone: '+1 555-1006', company: 'MediaGroup', role: 'Marketing VP', type: 'Partner', location: 'Denver, CO', lastActivity: '2026-02-09' },
  { id: 7, name: 'Chris Martinez', email: 'chris@cloud.io', phone: '+1 555-1007', company: 'CloudSync', role: 'Solutions Architect', type: 'Vendor', location: 'Portland, OR', lastActivity: '2026-02-07' },
  { id: 8, name: 'Lisa Anderson', email: 'lisa@internal.com', phone: '+1 555-1008', company: 'OrthodoxMetrics', role: 'Designer', type: 'Employee', location: 'Boston, MA', lastActivity: '2026-02-16' },
  { id: 9, name: 'David Lee', email: 'david@startup.ai', phone: '+1 555-1009', company: 'StartupAI', role: 'Founder', type: 'Customer', location: 'Miami, FL', lastActivity: '2026-02-06' },
  { id: 10, name: 'Rachel Kim', email: 'rachel@consulting.biz', phone: '+1 555-1010', company: 'ConsultPro', role: 'Senior Consultant', type: 'Partner', location: 'Atlanta, GA', lastActivity: '2026-02-05' },
];

let nextId = 100;

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Berry Components' },
  { title: 'CRM' },
  { title: 'Contact Management' },
];

interface BerryContactManagementPageProps { embedded?: boolean; }

export default function BerryContactManagementPage({ embedded }: BerryContactManagementPageProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formType, setFormType] = useState<Contact['type']>('Customer');
  const [formLocation, setFormLocation] = useState('');

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const openNew = () => {
    setEditing(null);
    setFormName(''); setFormEmail(''); setFormPhone(''); setFormCompany(''); setFormRole(''); setFormType('Customer'); setFormLocation('');
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setFormName(c.name); setFormEmail(c.email); setFormPhone(c.phone); setFormCompany(c.company); setFormRole(c.role); setFormType(c.type); setFormLocation(c.location);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const data = { name: formName, email: formEmail, phone: formPhone, company: formCompany, role: formRole, type: formType, location: formLocation };
    if (editing) {
      setContacts((prev) => prev.map((c) => c.id === editing.id ? { ...c, ...data } : c));
    } else {
      setContacts((prev) => [...prev, { ...data, id: nextId++, lastActivity: new Date().toISOString().split('T')[0] }]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const content = (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <OutlinedInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search contacts..."
              startAdornment={<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>}
              size="small"
              sx={{ width: { xs: '100%', sm: 300 } }}
            />
            <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openNew}>
              Add Contact
            </Button>
          </Stack>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((contact) => (
                    <TableRow key={contact.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: `${typeColors[contact.type]}.main` }}>
                            {getInitials(contact.name)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{contact.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{contact.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{contact.company}</TableCell>
                      <TableCell>{contact.role}</TableCell>
                      <TableCell><Chip label={contact.type} color={typeColors[contact.type]} size="small" /></TableCell>
                      <TableCell>{contact.location}</TableCell>
                      <TableCell>{contact.lastActivity}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => openEdit(contact)}><IconEdit size={18} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(contact.id)}><IconTrash size={18} /></IconButton>
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
        <DialogTitle>{editing ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} fullWidth autoFocus />
            <Grid container spacing={2}>
              <Grid size={6}><TextField label="Email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} fullWidth /></Grid>
              <Grid size={6}><TextField label="Phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} fullWidth /></Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={6}><TextField label="Company" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} fullWidth /></Grid>
              <Grid size={6}><TextField label="Role" value={formRole} onChange={(e) => setFormRole(e.target.value)} fullWidth /></Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField select label="Type" value={formType} onChange={(e) => setFormType(e.target.value as Contact['type'])} fullWidth>
                  {(['Customer', 'Partner', 'Vendor', 'Employee'] as const).map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={6}><TextField label="Location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} fullWidth /></Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formName.trim()}>
            {editing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  if (embedded) return content;

  return (
    <PageContainer title="Contact Management" description="Berry CRM - Contact Management">
      <Breadcrumb title="Contact Management" items={BCrumb} />
      {content}
    </PageContainer>
  );
}
