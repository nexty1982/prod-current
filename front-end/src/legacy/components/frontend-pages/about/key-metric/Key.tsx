import { Grid, Typography } from '@mui/material';

const keys = [
  {
    text: 'Founded',
    title: '2025',
    subtext: 'When we founded Orthodox Metrics',
  },
  {
    text: 'Growth',
    title: 'TBD',
    subtext: 'We anticipate fast growth ',
  },
  {
    text: 'Customers',
    title: '1',
    isMargin: true,
    subtext: 'Customers of Orthodox Metrics',
  },
  {
    text: 'Themes',
    title: '8',
    isMargin: true,
    subtext: 'Orthodox Christian liturgical color themes that follow the church Calendar',
  },
];

const Key = () => {
  return (
    (<Grid container spacing={2}>
      {keys.map((key, i) => (
        <Grid
          key={i}
          sx={{
            marginTop: {
              lg: key.isMargin ? '32px' : 0,
            },
          }}
          size={{
            xs: 6,
            sm: 6
          }}>
          <Typography color="primary.main" textTransform="uppercase" fontSize="13px">
            {key.text}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontSize: {
                xs: '34px',
                sm: '48px',
              },
            }}
            my={1}
            lineHeight={1}
            fontWeight={700}
          >
            {key.title}
          </Typography>
          <Typography variant="body1">{key.subtext}</Typography>
        </Grid>
      ))}
    </Grid>)
  );
};

export default Key;
