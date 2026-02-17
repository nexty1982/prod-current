// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

// assets
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';

// ==============================|| BLOG DRAFTS ||============================== //

export default function Drafts() {
  const theme = useTheme();
  const downLG = useMediaQuery(theme.breakpoints.down('lg'));

  const articlesData = [
    {
      name: 'Understanding React Components',
      publishDate: '21 April, 2021'
    },
    {
      name: 'JavaScript ES6 Features',
      publishDate: '15 March, 2021'
    },
    {
      name: 'CSS Grid vs Flexbox',
      publishDate: '30 January, 2022'
    },
    {
      name: 'Building a REST API with Node.js',
      publishDate: '10 June, 2022'
    },
    {
      name: 'Understanding TypeScript',
      publishDate: '5 September, 2022'
    }
  ];

  return (
    <Card sx={{ borderRadius: 0 }}>
      <CardHeader
        title={
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            Drafts
            <Typography variant="h4" sx={{ color: 'error.dark' }}>
              (2)
            </Typography>
          </Stack>
        }
      />
      <Divider />
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
                <TableCell sx={{ pr: 3 }}>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
                    {downLG ? (
                      <Tooltip
                        placement="top"
                        title="Continue writing"
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
                        <IconButton color="primary" size="small">
                          <EditTwoToneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip
                        placement="top"
                        title="Continue writing"
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
                        <Button
                          color="primary"
                          variant="outlined"
                          sx={{ textTransform: 'none' }}
                          startIcon={<EditTwoToneIcon fontSize="small" />}
                          aria-label="Continue writing"
                        >
                          Continue writing
                        </Button>
                      </Tooltip>
                    )}

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
    </Card>
  );
}
