// frontend/src/pages/auth/ui/login-page.tsx
import {useEffect} from 'react';
import {useNavigate} from 'react-router';
import {LoginModal} from '@widgets/auth/ui/LoginModal';
import {useLogin} from '@pages/auth/lib/useLogin';

export default function LoginPage() {
    const navigate = useNavigate();
    const {checkAuth} = useLogin();

    // Если пользователь уже авторизован, перенаправляем на главную
    useEffect(() => {
        if (checkAuth()) {
            navigate('/');
        }
    }, [checkAuth, navigate]);

    const handleClose = () => {
        navigate('/');
    };

    const handleLoginSuccess = () => {
        navigate('/');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main-gradient)'
        }}>
            <LoginModal
                onClose={handleClose}
                onLoginSuccess={handleLoginSuccess}
            />
        </div>
    );
}
