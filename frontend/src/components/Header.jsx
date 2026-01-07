// src/components/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="dashboard-header">
      <Link to="/" className="header-logo-link">
        <h1>
          <i className="fas fa-database"></i> DB HUB
        </h1>
        <p>Платформа управления базами данных</p>
      </Link>
    </header>
  );
};

export default Header;