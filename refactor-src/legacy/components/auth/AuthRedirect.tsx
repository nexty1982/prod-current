import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

const AuthRedirect: React.FC = () => {
  const { authenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !authenticated) {
      navigate('/auth/login');
    } else if (!loading && authenticated) {
      navigate('/dashboards/modern');
    }
  }, [authenticated, loading, navigate]);

  if (loading) {
    return null; // or a loading spinner
  }

  return null;
};

export default AuthRedirect;
