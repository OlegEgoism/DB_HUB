// src/components/Footer.jsx
import React from 'react';
import {useNavigate} from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();

    return (
        <footer className="dashboard-footer">
            <div className="footer-links">
                <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => alert('Раздел в разработке')}
                >
                    <i className="fas fa-book"></i> Документация
                </button>
                <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => alert('Раздел в разработке')}
                >
                    <i className="fas fa-envelope"></i> Контакты
                </button>
                <button
                    type="button"
                    className="footer-link-button"
                    onClick={() => navigate('/agreement')}
                >
                    <i className="fas fa-user-alt"></i> Пользовательское соглашение
                </button>
            </div>
        </footer>
    );
};

export default Footer;