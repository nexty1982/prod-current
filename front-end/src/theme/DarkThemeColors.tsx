const DarkThemeColors = [
  {
    name: 'WHITE_THEME',
    palette: {
      primary: {
        main: '#F5F5F0',
        light: '#3a3a3a',
        dark: '#E8E8E3',
        contrastText: '#1a1a1a',
      },
      secondary: {
        main: '#C9A227',
        light: '#3d3520',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
      background: {
        default: '#1a1a1a',
        dark: '#1a1a1a',
        paper: '#252525',
      },
    },
  },
  {
    name: 'GREEN_THEME',
    palette: {
      // Pentecost green (dark variant) — same #2E7D32 main as light
      // theme; light slot uses a deep shadow color so dark-mode card
      // backgrounds stay readable behind primary text.
      primary: {
        main: '#2E7D32',
        light: '#1a2e1c',
        dark: '#1B5E20',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#F5F5F0',
        light: '#3a3a3a',
        dark: '#E8E8E3',
        contrastText: '#1a1a1a',
      },
      background: {
        default: '#171c23',
        dark: '#171c23',
        paper: '#1e252e',
      },
    },
  },
  {
    name: 'PURPLE_THEME',
    palette: {
      primary: {
        main: '#6B2D75',
        light: '#2a1530',
        dark: '#5A2563',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#C9A227',
        light: '#3d3520',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
      background: {
        default: '#171c23',
        dark: '#171c23',
        paper: '#1e252e',
      },
    },
  },
  {
    name: 'RED_THEME',
    palette: {
      primary: {
        main: '#B22234',
        light: '#3d1520',
        dark: '#9E1E2E',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#C9A227',
        light: '#3d3520',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
      background: {
        default: '#171c23',
        dark: '#171c23',
        paper: '#1e252e',
      },
    },
  },
  {
    name: 'BLUE_THEME',
    palette: {
      // Aqua blue (dark variant) — same #00ACC1 main as light theme.
      primary: {
        main: '#00ACC1',
        light: '#0a2730',
        dark: '#00838F',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#C9A227',
        light: '#3d3520',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
      background: {
        default: '#171c23',
        dark: '#171c23',
        paper: '#1e252e',
      },
    },
  },
  {
    name: 'GOLD_THEME',
    palette: {
      primary: {
        main: '#C9A227',
        light: '#3d3520',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
      // Secondary tracks BLUE_THEME's aqua primary for visual consistency.
      secondary: {
        main: '#00ACC1',
        light: '#0a2730',
        dark: '#00838F',
        contrastText: '#ffffff',
      },
      background: {
        default: '#171c23',
        dark: '#171c23',
        paper: '#1e252e',
      },
    },
  },
  {
    name: 'LENT_THEME',
    palette: {
      primary: {
        main: '#e0e0e0',
        light: '#2a2a2a',
        dark: '#bdbdbd',
        contrastText: '#000000',
      },
      secondary: {
        main: '#9e9e9e',
        light: '#1f1f1f',
        dark: '#757575',
        contrastText: '#000000',
      },
      background: {
        default: '#0a0a0a',
        dark: '#0a0a0a',
        paper: '#141414',
      },
    },
  },
];

export { DarkThemeColors };

