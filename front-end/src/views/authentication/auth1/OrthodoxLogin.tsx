import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Checkbox, FormControlLabel, styled } from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router';

// Styled components to match the original design
const LoginContainer = styled(Box)(() => ({
    fontFamily: 'Georgia, Times New Roman, serif',
    height: '100vh',
    background: 'linear-gradient(135deg, #f7f5ff 0%, #f0ebff 100%)',
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
}));

const MainContainer = styled(Box)({
    display: 'flex',
    width: '100%',
    height: '100vh',
    position: 'relative',
    zIndex: 2,
});

const LeftSection = styled(Box)({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    position: 'relative',
});

const OrthodoxCross = styled(Box)({
    width: '120px',
    height: '120px',
    marginBottom: '2rem',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    '&::before': {
        content: '""',
        position: 'absolute',
        width: '8px',
        height: '100px',
        background: '#D4AF37',
        borderRadius: '4px',
    },

    '&::after': {
        content: '""',
        position: 'absolute',
        top: '20px',
        width: '60px',
        height: '6px',
        background: '#D4AF37',
        borderRadius: '3px',
    },
});

const BrandTitle = styled(Typography)({
    color: '#9A7FC7',
    fontSize: '2.5rem',
    fontWeight: 400,
    marginBottom: '0.5rem',
    textAlign: 'center',
});

const BrandSubtitle = styled(Typography)({
    color: '#D4AF37',
    fontSize: '1.2rem',
    fontWeight: 300,
    marginBottom: '1rem',
    textAlign: 'center',
});

const BrandDescription = styled(Typography)({
    color: '#666',
    fontSize: '1rem',
    textAlign: 'center',
    maxWidth: '500px',
    lineHeight: 1.6,
    marginBottom: '2rem',
});

const RightSection = styled(Box)({
    flex: '0 0 450px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderLeft: '1px solid rgba(154, 127, 199, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    boxShadow: '-5px 0 20px rgba(0,0,0,0.05)',
});

const LoginFormContainer = styled(Box)({
    width: '100%',
    maxWidth: '350px',
});

const LoginTitle = styled(Typography)({
    color: '#9A7FC7',
    fontSize: '2rem',
    fontWeight: 400,
    marginBottom: '0.5rem',
    textAlign: 'center',
});

const LoginSubtitle = styled(Typography)({
    color: '#666',
    fontSize: '1rem',
    marginBottom: '2.5rem',
    textAlign: 'center',
});

const StyledTextField = styled(TextField)({
    marginBottom: '1.5rem',
    '& .MuiOutlinedInput-root': {
        borderRadius: '8px',
        '& fieldset': {
            borderColor: 'rgba(154, 127, 199, 0.3)',
        },
        '&:hover fieldset': {
            borderColor: '#9A7FC7',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#9A7FC7',
        },
    },
    '& .MuiInputLabel-root': {
        color: '#333',
        fontWeight: 500,
    },
});

const FormOptions = styled(Box)({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
});

const SignInButton = styled(Button)({
    width: '100%',
    padding: '1rem',
    background: 'linear-gradient(135deg, #D4AF37, #F4D03F)',
    color: 'white',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '1rem',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
    '&:hover': {
        background: 'linear-gradient(135deg, #B8941F, #D4AF37)',
        transform: 'translateY(-2px)',
        boxShadow: '0 5px 15px rgba(212, 175, 55, 0.4)',
    },
});

const CreateAccount = styled(Box)({
    textAlign: 'center',
    marginTop: '2rem',
    color: '#666',
    fontSize: '0.95rem',
    '& a': {
        color: '#9A7FC7',
        textDecoration: 'none',
        fontWeight: 500,
        '&:hover': {
            textDecoration: 'underline',
        },
    },
});

// Add keyframes for animations
const globalStyles = `
  @keyframes float-right {
    0% { transform: translateX(-100px); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateX(calc(100vw + 100px)); opacity: 0; }
  }
  
  @keyframes float-left {
    0% { transform: translateX(calc(100vw + 100px)); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateX(-100px); opacity: 0; }
  }
  
  @keyframes float-up {
    0% { transform: translateY(100vh); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100px); opacity: 0; }
  }
  
  @keyframes float-down {
    0% { transform: translateY(-100px); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(100vh); opacity: 0; }
  }
  
  @media (max-width: 768px) {
    .login-container {
      flex-direction: column;
    }
    .right-section {
      flex: none !important;
      border-left: none !important;
      border-top: 1px solid rgba(154, 127, 199, 0.15) !important;
    }
  }
`;

const OrthodoxLogin: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number, text: string, style: any }>>([]);

    // Orthodox phrases for floating text
    const phrases = [
        'Ἅγιος ὁ Θεός', 'Православная', 'Κύριε ἐλέησον', 'Монастир', 'Mănăstire',
        'Αγιογραφία', 'Света Литургија', 'Παναγία', 'Άγιος Νικόλαος', 'Преподобный',
        'Θεοτόκος', 'Патриарх', 'Εκκλησία', 'Χριστός ἀνέστη', 'Воскресе Христос',
        'Hristos a înviat', 'Κύριος μετὰ σοῦ', 'Бог с вами', 'Domnul să fie cu tine',
        'Ἀμήν', 'Слава Богу', 'Slavă Domnului', 'Ἅγιος Ἅγιος', 'Святый Святый',
        'Sfânt Sfânt', 'Εἰρήνη πᾶσι', 'Мир всем', 'Pace tuturor'
    ];

    const animations = ['right', 'left', 'up', 'down'];
    const sizes = ['small', '', 'large'];

    // Create floating text effect
    useEffect(() => {
        // Insert global styles
        const styleSheet = document.createElement('style');
        styleSheet.textContent = globalStyles;
        document.head.appendChild(styleSheet);

        // Initial floating texts
        const initialTexts = [
            { text: 'Ἅγιος ὁ Θεός', top: '10%', animation: 'float-right 25s infinite linear' },
            { text: 'Православная', top: '20%', animation: 'float-left 30s infinite linear', size: 'large', delay: '-5s' },
            { text: 'Κύριε ἐλέησον', top: '30%', animation: 'float-right 20s infinite linear', size: 'small', delay: '-10s' },
            { text: 'Монастир', top: '40%', animation: 'float-up 28s infinite linear', delay: '-3s' },
            { text: 'Mănăstire', top: '50%', animation: 'float-left 35s infinite linear', size: 'large', delay: '-15s' },
            { text: 'Αγιογραφία', top: '60%', animation: 'float-down 22s infinite linear', size: 'small', delay: '-8s' },
            { text: 'Света Литургија', top: '70%', animation: 'float-right 26s infinite linear', delay: '-12s' },
            { text: 'Παναγία', top: '80%', animation: 'float-left 32s infinite linear', size: 'large', delay: '-18s' },
        ];

        setFloatingTexts(initialTexts.map((item, index) => ({
            id: index,
            text: item.text,
            style: {
                top: item.top,
                animation: item.animation,
                animationDelay: item.delay || '0s',
                fontSize: item.size === 'large' ? '2rem' : item.size === 'small' ? '0.9rem' : '1.2rem',
                color: item.size === 'large' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(154, 127, 199, 0.15)',
            }
        })));

        // Create new floating text periodically
        const interval = setInterval(() => {
            const newText = {
                id: Date.now(),
                text: phrases[Math.floor(Math.random() * phrases.length)],
                style: {
                    top: Math.random() * 80 + 10 + '%',
                    left: Math.random() * 80 + 10 + '%',
                    animation: `float-${animations[Math.floor(Math.random() * animations.length)]} ${20 + Math.random() * 20}s infinite linear`,
                    animationDelay: `-${Math.random() * 20}s`,
                    fontSize: sizes[Math.floor(Math.random() * sizes.length)] === 'large' ? '2rem' :
                        sizes[Math.floor(Math.random() * sizes.length)] === 'small' ? '0.9rem' : '1.2rem',
                    color: 'rgba(154, 127, 199, 0.15)',
                }
            };

            setFloatingTexts(prev => [...prev, newText]);

            // Remove after animation
            setTimeout(() => {
                setFloatingTexts(prev => prev.filter(item => item.id !== newText.id));
            }, 40000);
        }, 3000);

        return () => {
            clearInterval(interval);
            document.head.removeChild(styleSheet);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LoginContainer className="login-container">
            {/* Floating Background Text */}
            {floatingTexts.map((item) => (
                <Box
                    key={item.id}
                    sx={{
                        position: 'absolute',
                        fontWeight: 300,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        zIndex: 1,
                        ...item.style
                    }}
                >
                    {item.text}
                </Box>
            ))}

            <MainContainer>
                <LeftSection>
                    <OrthodoxCross />

                    <BrandTitle>Orthodox Metrics</BrandTitle>
                    <BrandSubtitle>Recording the Saints Among Us</BrandSubtitle>

                    <BrandDescription>
                        AI-powered digitization of handwritten Orthodox records in Greek, Russian, Romanian,
                        and more. Preserving our sacred heritage for future generations through cutting-edge technology.
                    </BrandDescription>
                </LeftSection>

                <RightSection className="right-section">
                    <LoginFormContainer>
                        <LoginTitle>Welcome Back</LoginTitle>
                        <LoginSubtitle>Sign in to your dashboard</LoginSubtitle>

                        <form onSubmit={handleSubmit}>
                            <StyledTextField
                                fullWidth
                                type="email"
                                label="Email Address"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                variant="outlined"
                            />

                            <StyledTextField
                                fullWidth
                                type="password"
                                label="Password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                variant="outlined"
                            />

                            {error && (
                                <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
                                    {error}
                                </Typography>
                            )}

                            <FormOptions>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            sx={{ color: '#9A7FC7' }}
                                        />
                                    }
                                    label="Remember me"
                                    sx={{ color: '#666' }}
                                />
                                <Typography
                                    component="a"
                                    href="#"
                                    sx={{
                                        color: '#9A7FC7',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem',
                                        '&:hover': { textDecoration: 'underline' }
                                    }}
                                >
                                    Forgot password?
                                </Typography>
                            </FormOptions>

                            <SignInButton
                                type="submit"
                                disabled={loading}
                                variant="contained"
                            >
                                {loading ? 'Signing In...' : 'Sign In'}
                            </SignInButton>
                        </form>

                        <CreateAccount>
                            Don't have an account? <a href="#">Create one here</a>
                        </CreateAccount>
                    </LoginFormContainer>
                </RightSection>
            </MainContainer>
        </LoginContainer>
    );
};

export default OrthodoxLogin;
