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
  LinearProgress,
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

interface Deal {
  id: number;
  title: string;
  customer: string;
  value: number;
  stage: 'Prospecting' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  probability: number;
  owner: string;
  expectedClose: string;
  createdAt: string;
}

const stageColors: Record<Deal['stage'], 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  Prospecting: 'info',
  Proposal: 'warning',
  Negotiation: 'default',
  'Closed Won': 'success',
  'Closed Lost': 'error',
};

const initialDeals: Deal[] = [
  { id: 1, title: 'Enterprise Platform License', customer: 'TechVentures Inc', value: 120000, stage: 'Negotiation', probability: 70, owner: 'John Smith', expectedClose: '2026-03-15', createdAt: '2026-01-10' },
  { id: 2, title: 'Cloud Migration Project', customer: 'Global Retail Corp', value: 85000, stage: 'Proposal', probability: 50, owner: 'Sarah Johnson', expectedClose: '2026-04-01', createdAt: '2026-01-20' },
  { id: 3, title: 'Data Analytics Suite', customer: 'FinanceFirst LLC', value: 45000, stage: 'Closed Won', probability: 100, owner: 'Mike Chen', expectedClose: '2026-02-10', createdAt: '2025-12-05' },
  { id: 4, title: 'Custom CRM Integration', customer: 'StartupAI', value: 35000, stage: 'Prospecting', probability: 20, owner: 'Emily Davis', expectedClose: '2026-05-01', createdAt: '2026-02-01' },
  { id: 5, title: 'Security Audit Package', customer: 'HealthCare Plus', value: 28000, stage: 'Closed Lost', probability: 0, owner: 'Alex Turner', expectedClose: '2026-02-05', createdAt: '2025-11-15' },
  { id: 6, title: 'Mobile App Development', customer: 'RetailMax', value: 95000, stage: 'Proposal', probability: 40, owner: 'John Smith', expectedClose: '2026-04-15', createdAt: '2026-01-28' },
  { id: 7, title: 'Annual Support Contract', customer: 'MediaGroup', value: 24000, stage: 'Negotiation', probability: 85, owner: 'Sarah Johnson', expectedClose: '2026-03-01', createdAt: '2026-02-05' },
  { id: 8, title: 'Infrastructure Upgrade', customer: 'EduTech Corp', value: 150000, stage: 'Prospecting', probability: 15, owner: 'Mike Chen', expectedClose: '2026-06-01', createdAt: '2026-02-12' },
];

let nextId = 100;

// Summary cards
function SummaryCards({ deals }: { deals: Deal[] }) {
  const totalPipeline = deals.filter((d) => !d.stage.startsWith('Closed')).reduce((s, d) => s + d.value, 0);
  const closedWon = deals.filter((d) => d.stage === 'Closed Won').reduce((s, d) => s + d.value, 0);
  const avgDealSize = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length) : 0;
  const winRate = deals.filter((d) => d.stage.startsWith('Closed')).length > 0
    ? Math.round((deals.filter((d) => d.stage === 'Closed Won').length / deals.filter((d) => d.stage.startsWith('Closed')).length) * 100)
    : 0;

  const cards = [
    { label: 'Total Pipeline', value: `$${totalPipeline.toLocaleString()}`, color: 'primary.main' },
    { label: 'Closed Won', value: `$${closedWon.toLocaleString()}`, color: 'success.main' },
    { label: 'Avg Deal Size', value: `$${avgDealSize.toLocaleString()}`, color: 'warning.main' },
    { label: 'Win Rate', value: `${winRate}%`, color: 'info.main' },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {cards.map((c) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={c.label}>
          <Card variant="outlined">
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {c.label}
              </Typography>
              <Typography variant="h4" sx={{ color: c.color }}>
                {c.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Berry Components' },
  { title: 'CRM' },
  { title: 'Sales Management' },
];

interface BerrySalesManagementPageProps { embedded?: boolean; }

export default function BerrySalesManagementPage({ embedded }: BerrySalesManagementPageProps) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formCustomer, setFormCustomer] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formStage, setFormStage] = useState<Deal['stage']>('Prospecting');
  const [formProbability, setFormProbability] = useState('20');
  const [formOwner, setFormOwner] = useState('');
  const [formExpectedClose, setFormExpectedClose] = useState('');

  const filtered = useMemo(() => {
    if (!search) return deals;
    const q = search.toLowerCase();
    return deals.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.customer.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q)
    );
  }, [deals, search]);

  const openNew = () => {
    setEditing(null);
    setFormTitle(''); setFormCustomer(''); setFormValue(''); setFormStage('Prospecting'); setFormProbability('20'); setFormOwner(''); setFormExpectedClose('');
    setDialogOpen(true);
  };

  const openEdit = (d: Deal) => {
    setEditing(d);
    setFormTitle(d.title); setFormCustomer(d.customer); setFormValue(String(d.value)); setFormStage(d.stage); setFormProbability(String(d.probability)); setFormOwner(d.owner); setFormExpectedClose(d.expectedClose);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;
    const data = {
      title: formTitle,
      customer: formCustomer,
      value: Number(formValue) || 0,
      stage: formStage,
      probability: Number(formProbability) || 0,
      owner: formOwner,
      expectedClose: formExpectedClose,
    };
    if (editing) {
      setDeals((prev) => prev.map((d) => d.id === editing.id ? { ...d, ...data } : d));
    } else {
      setDeals((prev) => [...prev, { ...data, id: nextId++, createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const content = (
    <>
      <SummaryCards deals={deals} />

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <OutlinedInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search deals..."
              startAdornment={<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>}
              size="small"
              sx={{ width: { xs: '100%', sm: 300 } }}
            />
            <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openNew}>
              Add Deal
            </Button>
          </Stack>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Deal</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Probability</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Expected Close</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((deal) => (
                    <TableRow key={deal.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{deal.title}</Typography>
                      </TableCell>
                      <TableCell>{deal.customer}</TableCell>
                      <TableCell align="right">${deal.value.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={deal.stage} color={stageColors[deal.stage]} size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={deal.probability}
                            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                            color={deal.probability >= 70 ? 'success' : deal.probability >= 40 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption" sx={{ minWidth: 30 }}>
                            {deal.probability}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{deal.owner}</TableCell>
                      <TableCell>{deal.expectedClose}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => openEdit(deal)}><IconEdit size={18} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(deal.id)}><IconTrash size={18} /></IconButton>
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
        <DialogTitle>{editing ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Deal Title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} fullWidth autoFocus />
            <Grid container spacing={2}>
              <Grid size={6}><TextField label="Customer" value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} fullWidth /></Grid>
              <Grid size={6}><TextField label="Value ($)" value={formValue} onChange={(e) => setFormValue(e.target.value)} fullWidth type="number" /></Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={4}>
                <TextField select label="Stage" value={formStage} onChange={(e) => setFormStage(e.target.value as Deal['stage'])} fullWidth>
                  {(['Prospecting', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] as const).map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={4}><TextField label="Probability (%)" value={formProbability} onChange={(e) => setFormProbability(e.target.value)} fullWidth type="number" /></Grid>
              <Grid size={4}><TextField label="Owner" value={formOwner} onChange={(e) => setFormOwner(e.target.value)} fullWidth /></Grid>
            </Grid>
            <TextField
              label="Expected Close"
              type="date"
              value={formExpectedClose}
              onChange={(e) => setFormExpectedClose(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formTitle.trim()}>
            {editing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  if (embedded) return content;

  return (
    <PageContainer title="Sales Management" description="Berry CRM - Sales Management">
      <Breadcrumb title="Sales Management" items={BCrumb} />
      {content}
    </PageContainer>
  );
}
