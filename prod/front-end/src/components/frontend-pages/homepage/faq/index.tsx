import { Box, Typography, Grid, Container, Link } from '@mui/material';

import { styled } from '@mui/material/styles';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { useState } from 'react';

const FAQ = () => {
  const theme = useTheme();

  const [expanded, setExpanded] = useState(true);
  const [expanded2, setExpanded2] = useState(false);
  const [expanded3, setExpanded3] = useState(false);
  const [expanded4, setExpanded4] = useState(false);
  const [expanded5, setExpanded5] = useState(false);
  const [expanded6, setExpanded6] = useState(false);

  const StyledAccordian = styled(Accordion)(() => ({
    borderRadius: '8px',
    marginBottom: '16px !important',
    boxShadow: theme.palette.mode == 'light' ? '0px 3px 0px rgba(235, 241, 246, 0.25)' : 'unset',
    border: `1px solid ${theme.palette.divider}`,
    '&:before': {
      display: 'none',
    },
    '&.Mui-expanded': {
      margin: '0',
    },
    '& .MuiAccordionSummary-root': {
      padding: '8px 24px',
      minHeight: '60px',
      fontSize: '18px',
      fontWeight: 500,
    },
    '& .MuiAccordionDetails-root': {
      padding: '0 24px 24px',
    },
  }));

  const handleChange = () => {
    setExpanded(!expanded);
  };

  const handleChange2 = () => {
    setExpanded2(!expanded2);
  };

  const handleChange3 = () => {
    setExpanded3(!expanded3);
  };

  const handleChange4 = () => {
    setExpanded4(!expanded4);
  };

  const handleChange5 = () => {
    setExpanded5(!expanded5);
  };

  const handleChange6 = () => {
    setExpanded6(!expanded6);
  };

  return (
    (<Container
      maxWidth="lg"
      sx={{
        pb: {
          xs: '30px',
          lg: '60px',
        },
      }}
    >
      <Grid container spacing={3} justifyContent="center">
        <Grid
          size={{
            xs: 12,
            lg: 8
          }}>
          <Typography
            variant="h4"
            textAlign="center"
            lineHeight="1.2"
            sx={{
              fontSize: {
                lg: '40px',
                xs: '35px',
              },
            }}
            fontWeight="700"
          >
            Frequently Asked Questions
          </Typography>
          <Box mt={7}>
            <StyledAccordian expanded={expanded} onChange={handleChange}>
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
                What is included with my purchase?
              </AccordionSummary>
              <AccordionDetails>
                An initial consult for a discussion about your church and how we can best assist you.
              </AccordionDetails>
            </StyledAccordian>
            <StyledAccordian expanded={expanded2} onChange={handleChange2}>
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
                One time purchase
              </AccordionSummary>
              <AccordionDetails>
                One time purchase for continual use as your church grows.
              </AccordionDetails>
            </StyledAccordian>
            <StyledAccordian expanded={expanded3} onChange={handleChange3}>
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
                How does the Orthodox Metrics calendar work?
              </AccordionSummary>
              <AccordionDetails>
                The calendar serves as a reference for both Old and New Calendar liturgical timelines
              </AccordionDetails>
            </StyledAccordian>
            <StyledAccordian expanded={expanded4} onChange={handleChange4}>
              <AccordionSummary
                expandIcon={
                  expanded4 ? (
                    <IconMinus size="21" stroke="1.5" />
                  ) : (
                    <IconPlus size="21" stroke="1.5" />
                  )
                }
                aria-controls="panel2-content"
                id="panel2-header"
              >
                What is the timeframe to have the church records complete?
              </AccordionSummary>
              <AccordionDetails>
                We will work with you, in general the timeframe is relative to the amount of records and how much you need us to do.
              </AccordionDetails>
            </StyledAccordian>
            <StyledAccordian expanded={expanded5} onChange={handleChange5}>
              <AccordionSummary
                expandIcon={
                  expanded5 ? (
                    <IconMinus size="21" stroke="1.5" />
                  ) : (
                    <IconPlus size="21" stroke="1.5" />
                  )
                }
                aria-controls="panel2-content"
                id="panel2-header"
              >
                What if I need to print a baptismal or marriage certificate, can I do that?
              </AccordionSummary>
              <AccordionDetails>
                Of course. Certificates are dynamically generated and use the template that is provided by your head of church.
              </AccordionDetails>
            </StyledAccordian>
            <StyledAccordian expanded={expanded6} onChange={handleChange6}>
              <AccordionSummary
                expandIcon={
                  expanded6 ? (
                    <IconMinus size="21" stroke="1.5" />
                  ) : (
                    <IconPlus size="21" stroke="1.5" />
                  )
                }
                aria-controls="panel2-content"
                id="panel2-header"
              >
                How can I get support? 
              </AccordionSummary>
              <AccordionDetails>
                Email is ideal, but we can schedule a call if you prefer talking.
              </AccordionDetails>
            </StyledAccordian>
          </Box>
        </Grid>
      </Grid>
      <Grid container spacing={3} justifyContent="center">
        <Grid
          size={{
            xs: 12,
            lg: 5
          }}>
          <Box
            mt={5}
            borderRadius="8px"
            display="inline-flex"
            justifyContent="center"
            gap="4px"
            alignItems="center"
            fontWeight={500}
            sx={{
              border: `1px dashed ${theme.palette.divider}`,
              padding: '7px 10px',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
          >
            <Typography>Still have a question?</Typography>
            <Link
              href="https://discord.com/invite/XujgB8ww4n"
              color="inherit"
              underline="always"
              sx={{
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              Email us{' '}
            </Link>
            <Typography>or</Typography>
            <Link
              href="/support/"
              color="inherit"
              underline="always"
              sx={{
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              submit a ticket
            </Link>
            .
          </Box>
        </Grid>
      </Grid>
    </Container>)
  );
};
export default FAQ;
