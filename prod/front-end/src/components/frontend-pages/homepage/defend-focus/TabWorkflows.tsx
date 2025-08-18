import { Box, Divider, Typography, Grid, Button } from '@mui/material';

import { styled } from '@mui/material/styles';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { useState } from 'react';
import IconAcc from 'src/assets/images/frontend-pages/homepage/accordian1.jpg';

const StyledAccordian = styled(Accordion)(() => ({
  boxShadow: 'none',
  marginBottom: '0 !important',
  '&.Mui-expanded': {
    margin: '0',
  },
  '& .MuiAccordionSummary-root': {
    padding: 0,
    minHeight: '60px',
  },
  '& .MuiAccordionDetails-root': {
    padding: '0 0 20px',
  },
}));

const TabWorkflows = () => {
  const [expanded, setExpanded] = useState(true);
  const [expanded2, setExpanded2] = useState(false);
  const [expanded3, setExpanded3] = useState(false);

  const handleChange2 = () => {
    setExpanded(!expanded);
  };

  const handleChange3 = () => {
    setExpanded2(!expanded2);
  };

  const handleChange4 = () => {
    setExpanded3(!expanded3);
  };

  return (
    (<Grid container spacing={{ xs: 3, lg: 8 }}>
      <Grid
        size={{
          xs: 12,
          lg: 6
        }}>
        <img
          src={IconAcc}
          width={500}
          height={500}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '8px',
          }}
          alt="img"
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          lg: 6
        }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: {
              lg: '40px',
              xs: '35px',
            },
          }}
          fontWeight="700"
          mt={5}
        >
          Orthodox 
        </Typography>
        <Box mt={4}>
          <StyledAccordian expanded={expanded2} onChange={handleChange3}>
            <AccordionSummary
              expandIcon={
                expanded2 ? (
                  <IconMinus size="21" stroke="1.5" />
                ) : (
                  <IconPlus size="21" stroke="1.5" />
                )
              }
              aria-controls="panel2-content"
              id="panel2-header"
            >
              <Typography fontSize="17px" fontWeight="600">
                Paper records don't last
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Have peace of mind knowing your records are safe and accessible 
              </Typography>
            </AccordionDetails>
          </StyledAccordian>
          <Divider />
          <StyledAccordian expanded={expanded} onChange={handleChange2}>
            <AccordionSummary
              expandIcon={
                expanded ? (
                  <IconMinus size="21" stroke="1.5" />
                ) : (
                  <IconPlus size="21" stroke="1.5" />
                )
              }
              aria-controls="panel1-content"
              id="panel1-header"
            >
              <Typography fontSize="17px" fontWeight="600">
                We are on the east coast and very ready to hear from you
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Small parish and concerned about pricing, don't be
              </Typography>
            </AccordionDetails>
          </StyledAccordian>
          <Divider />
          <StyledAccordian expanded={expanded3} onChange={handleChange4}>
            <AccordionSummary
              expandIcon={
                expanded3 ? (
                  <IconMinus size="21" stroke="1.5" />
                ) : (
                  <IconPlus size="21" stroke="1.5" />
                )
              }
              aria-controls="panel3-content"
              id="panel3-header"
            >
              <Typography fontSize="17px" fontWeight="600">
                High availability
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                We have servers that are robust and provide 24x7 access to records
              </Typography>
            </AccordionDetails>
          </StyledAccordian>
          <Divider />
          <Box mt={3}>
            <Button variant="contained" color="primary" size="large">
              Learn More
            </Button>
          </Box>
        </Box>
      </Grid>
    </Grid>)
  );
};
export default TabWorkflows;
