const LightThemeColors = [
  {
    name: 'WHITE_THEME',
    palette: {
      primary: {
        main: '#F5F5F0',
        light: '#FFFFFF',
        dark: '#E8E8E3',
        contrastText: '#1a1a1a',
      },
      secondary: {
        main: '#C9A227',
        light: '#F5EED6',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
    },
  },
  {
    name: 'GREEN_THEME',
    palette: {
      // Pentecost green — the deep, vibrant evergreen used liturgically
      // for Pentecost / Holy Spirit feasts. Replaces the chartreuse #A4C639
      // which read as "spring lime" rather than "feast green".
      primary: {
        main: '#2E7D32',
        light: '#C8E6C9',
        dark: '#1B5E20',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#F5F5F0',
        light: '#FFFFFF',
        dark: '#E8E8E3',
        contrastText: '#1a1a1a',
      },
    },
  },
  {
    name: 'PURPLE_THEME',
    palette: {
      primary: {
        main: '#6B2D75',
        light: '#E8D6EB',
        dark: '#5A2563',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#C9A227',
        light: '#F5EED6',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
    },
  },
  {
    name: 'RED_THEME',
    palette: {
      primary: {
        main: '#B22234',
        light: '#F5D6DA',
        dark: '#9E1E2E',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#C9A227',
        light: '#F5EED6',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
    },
  },
  {
    name: 'BLUE_THEME',
    palette: {
      // Aqua blue — bright cyan-leaning blue, replacing the previous
      // steel-blue #1E6B8C. Aligns with the user-facing label
      // "Aqua / Theotokos" in OrthodoxThemeToggle.
      primary: {
        main: '#00ACC1',
        light: '#B2EBF2',
        dark: '#00838F',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#C9A227',
        light: '#F5EED6',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
    },
  },
  {
    name: 'GOLD_THEME',
    palette: {
      primary: {
        main: '#C9A227',
        light: '#F5EED6',
        dark: '#B8931F',
        contrastText: '#ffffff',
      },
      // Secondary tracks BLUE_THEME's primary so the gold/blue pairing
      // stays consistent across both themes.
      secondary: {
        main: '#00ACC1',
        light: '#B2EBF2',
        dark: '#00838F',
        contrastText: '#ffffff',
      },
    },
  },
  {
    name: 'LENT_THEME',
    palette: {
      primary: {
        main: '#1a1a1a',
        light: '#f5f5f5',
        dark: '#000000',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#616161',
        light: '#eeeeee',
        dark: '#424242',
        contrastText: '#ffffff',
      },
    },
  },
];

export { LightThemeColors };

