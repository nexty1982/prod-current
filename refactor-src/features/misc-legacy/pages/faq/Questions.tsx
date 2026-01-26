import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid, Typography, Accordion, AccordionSummary, AccordionDetails, Divider, Box } from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';

const Questions = () => {
  return (
    (<Box>
      <Grid2 container spacing={3} justifyContent="center">
        <Grid2
          size={{
            xs: 12,
            lg: 8
          }}>
          <Typography variant="h3" textAlign="center" mb={1}>Frequently asked questions</Typography>
          <Typography variant="h6" fontWeight={400} color="textSecondary" textAlign="center" mb={4}>Get to know more about ready-to-use admin dashboard templates</Typography>
          <Accordion elevation={9}>
            <AccordionSummary
              expandIcon={<IconChevronDown />}
              aria-controls="panel1a-content"
              id="panel1a-header"
            >
              <Typography variant="h6" px={2} py={1}>What is an Admin Dashboard?</Typography>
            </AccordionSummary>
            <Divider />
            <AccordionDetails>
              <Typography variant="subtitle1" pt={1} px={2} color="textSecondary">
                Admin Dashboard is the backend interface of a website or an application that helps
                to manage the website's overall content and settings. It is widely used by the site
                owners to keep track of their website, make changes to their content, and more.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion elevation={9}>
            <AccordionSummary
              expandIcon={<IconChevronDown />}
              aria-controls="panel2a-content"
              id="panel2a-header"
            >
              <Typography variant="h6" px={2} py={1}>What should an admin dashboard template include?</Typography>
            </AccordionSummary>
            <Divider />
            <AccordionDetails>
              <Typography variant="subtitle1" pt={1} px={2} color="textSecondary">
                Admin dashboard template should include user & SEO friendly design with a variety of
                components and application designs to help create your own web application with
                ease. This could include customization options, technical support and about 6 months
                of future updates.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion elevation={9}>
            <AccordionSummary
              expandIcon={<IconChevronDown />}
              aria-controls="panel3a-content"
              id="panel3a-header"
            >
              <Typography variant="h6" px={2} py={1}>Why should I use this church management system?</Typography>
            </AccordionSummary>
            <Divider />
            <AccordionDetails>
              <Typography variant="subtitle1" pt={1} px={2} color="textSecondary">
                Our Orthodox Metrics system offers comprehensive tools that are easy to use and fully customizable.
                With features for church records, member management, and administrative tasks. The system is
                trusted and used by Orthodox churches worldwide to streamline their operations.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion elevation={9}>
            <AccordionSummary
              expandIcon={<IconChevronDown />}
              aria-controls="panel4a-content"
              id="panel4a-header"
            >
              <Typography variant="h6" px={2} py={1}>Do we offer technical support?</Typography>
            </AccordionSummary>
            <Divider />
            <AccordionDetails>
              <Typography variant="subtitle1" pt={1} px={2} color="textSecondary">
                Yes, we provide technical support for Orthodox Metrics. If you encounter any issues
                or need assistance, our support team is here to help.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Grid2>
      </Grid2>
    </Box>)
  );
};

export default Questions;
