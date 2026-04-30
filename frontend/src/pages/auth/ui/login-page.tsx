import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { LoginModal } from '@widgets/auth/ui/LoginModal';
import { RegisterModal } from '@widgets/auth/ui/RegisterModal';
import { useLogin } from '@pages/auth/lib/useLogin';
import '@app/styles/App.scss';

export default function LoginPage() {
  const navigate = useNavigate();
  const { checkAuth } = useLogin();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  useEffect(() => {
    if (checkAuth()) {
      navigate('/');
    }
  }, [checkAuth, navigate]);

  const containerStyle = useMemo(
    () => ({
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main-gradient)',
    }),
    [],
  );

  const handleClose = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleOpenRegister = useCallback(() => {
    setIsRegisterModalOpen(true);
  }, []);

  const handleCloseRegister = useCallback(() => {
    setIsRegisterModalOpen(false);
  }, []);

  return (
    <div style={containerStyle}>
      {isRegisterModalOpen ? (
        <RegisterModal onClose={handleCloseRegister} />
      ) : (
        <LoginModal onClose={handleClose} onLoginSuccess={handleClose} onOpenRegister={handleOpenRegister} />
      )}
    </div>
  );
}
