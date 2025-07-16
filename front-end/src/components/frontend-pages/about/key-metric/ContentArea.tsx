import { Typography } from '@mui/material';

const ContentArea = () => {
  return (
    <>
      <Typography
        variant="h1"
        mb={2}
        lineHeight={1.4}
        fontWeight={700}
        sx={{
          fontSize: {
            xs: '34px',
            sm: '40px',
          },
        }}
      >
        Key metrics at a glance
      </Typography>
      <Typography lineHeight={1.9}>
         We’re a startup built by Orthodox Christians, inspired by the needs of our parishes.
Our numbers reflect more than metrics—they tell the story of a mission-driven team answering the call to preserve sacred records and serve the Church in the digital age. From our first deployment to our growing community of early adopters, each step forward is grounded in faith, simplicity, and a deep respect for Orthodox tradition.
      </Typography>
    </>
  );
};

export default ContentArea;
