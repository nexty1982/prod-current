import { useNavigate } from 'react-router';

// material-ui
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// assets
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';

// ==============================|| BLOG ARTICLE ||============================== //

export default function Articles() {
  const navigate = useNavigate();

  const articlesData = [
    {
      name: 'Understanding React Components',
      publishDate: '21 April, 2021',
      status: 1
    },
    {
      name: 'JavaScript ES6 Features',
      publishDate: '15 March, 2021',
      status: 1
    },
    {
      name: 'CSS Grid vs Flexbox',
      publishDate: '30 January, 2022',
      status: 1
    },
    {
      name: 'Building a REST API with Node.js',
      publishDate: '10 June, 2022',
      status: 1
    },
    {
      name: 'Understanding TypeScript',
      publishDate: '5 September, 2022',
      status: 1
    },
    {
      name: 'State Management in React',
      publishDate: '20 July, 2021',
      status: 1
    },
    {
      name: 'Introduction to GraphQL',
      publishDate: '12 August, 2021',
      status: 1
    },
    {
      name: 'Async/Await in JavaScript',
      publishDate: '25 November, 2022',
      status: 1
    }
  ];

  return (
    <MainCard content={false} sx={{ borderRadius: 0 }} title="Articles">
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: 3 }}>
                <Typography variant="h4" sx={{ color: 'grey.500', fontWeight: 400 }}>
                  Articles
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h4" sx={{ color: 'grey.500', fontWeight: 400 }}>
                  Published Date
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h4" sx={{ color: 'grey.500', fontWeight: 400 }}>
                  Status
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {articlesData.map((data, index) => (
              <TableRow hover key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ pl: 3 }}>
                  <Typography variant="h4" sx={{ fontWeight: 400 }}>
                    {data.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h4" sx={{ fontWeight: 400 }}>
                    {data.publishDate}
                  </Typography>
                </TableCell>
                <TableCell>
                  {data.status === 1 && <Chip label="Published" size="small" color="success" />}
                  {data.status === 2 && <Chip label="Rejected" size="small" color="error" />}
                  {data.status === 3 && <Chip label="Pending" size="small" color="warning" />}
                </TableCell>
                <TableCell align="right" sx={{ pr: 3 }}>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
                    <Tooltip
                      placement="top"
                      title="Edit"
                      slotProps={{
                        popper: {
                          modifiers: [
                            {
                              name: 'offset',
                              options: {
                                offset: [0, -8]
                              }
                            }
                          ]
                        }
                      }}
                    >
                      <IconButton aria-label="edit" onClick={() => navigate('/apps/blog/edit')} size="small">
                        <EditOutlinedIcon sx={{ color: 'grey.500' }} fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip
                      placement="top"
                      title="Delete"
                      slotProps={{
                        popper: {
                          modifiers: [
                            {
                              name: 'offset',
                              options: {
                                offset: [0, -8]
                              }
                            }
                          ]
                        }
                      }}
                    >
                      <IconButton color="error" size="small">
                        <DeleteTwoToneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </MainCard>
  );
}
