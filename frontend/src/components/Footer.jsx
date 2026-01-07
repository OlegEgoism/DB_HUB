// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
    return (
        <footer className="dashboard-footer">
            <div className="footer-left">
                <div className="footer-links">
                    <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                        <i className="fas fa-book"></i> Документация
                    </button>
                    <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                        <i className="fas fa-envelope"></i> Контакты
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;