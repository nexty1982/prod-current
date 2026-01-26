import React, { useState } from 'react'
import { 
  Box, 
  Grid, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TableSortLabel,
  TextField,
  IconButton,
  Chip,
  Avatar
} from '@mui/material'
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

interface User {
  id: number
  name: string
  email: string
  role: string
  status: 'Active' | 'Inactive' | 'Pending'
  avatar: string
  lastLogin: string
}

const sampleUsers: User[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', avatar: 'JD', lastLogin: '2024-01-15' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'Active', avatar: 'JS', lastLogin: '2024-01-14' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'User', status: 'Inactive', avatar: 'MJ', lastLogin: '2024-01-10' },
  { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Editor', status: 'Pending', avatar: 'SW', lastLogin: '2024-01-12' },
  { id: 5, name: 'David Brown', email: 'david@example.com', role: 'User', status: 'Active', avatar: 'DB', lastLogin: '2024-01-13' },
  { id: 6, name: 'Lisa Anderson', email: 'lisa@example.com', role: 'Admin', status: 'Active', avatar: 'LA', lastLogin: '2024-01-15' },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'success'
    case 'Inactive': return 'error'
    case 'Pending': return 'warning'
    default: return 'default'
  }
}

const BasicDataTable = () => {
  const [users, setUsers] = useState(sampleUsers)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [orderBy, setOrderBy] = useState<keyof User>('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')

  const handleSort = (property: keyof User) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedUsers = filteredUsers.sort((a, b) => {
    if (order === 'asc') {
      return a[orderBy] < b[orderBy] ? -1 : 1
    }
    return a[orderBy] > b[orderBy] ? -1 : 1
  })

  const paginatedUsers = sortedUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <ComponentContainerCard
      id="basic-table"
      title="Advanced Data Table"
      description="Feature-rich data table with sorting, filtering, and pagination capabilities."
    >
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
        />
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'email'}
                  direction={orderBy === 'email' ? order : 'asc'}
                  onClick={() => handleSort('email')}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'role'}
                  direction={orderBy === 'role' ? order : 'asc'}
                  onClick={() => handleSort('role')}
                >
                  Role
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{user.avatar}</Avatar>
                    <Box>
                      <Box sx={{ fontWeight: 600 }}>{user.name}</Box>
                      <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                        ID: {user.id}
                      </Box>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.status} 
                    color={getStatusColor(user.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.lastLogin}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" color="primary">
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="warning">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredUsers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
      />
    </ComponentContainerCard>
  )
}

const AdvancedBasicTables = () => {
  return (
    <>
      <PageBreadcrumb subName="Enhanced Tables" title="Advanced Basic" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <BasicDataTable />
        </Grid>
      </Grid>
    </>
  )
}

export default AdvancedBasicTables