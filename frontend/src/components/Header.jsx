import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-container">
        {/* Brand */}
        <div className="brand" onClick={() => { navigate('/'); closeMenu(); }}>
          <div className="brand-logo">
            <img src="/images/logo_rs.png" width="70" alt="RiverSense logo" />
          </div>
          <div className="brand-title">
            <div>RiverSense</div>
            <div>Water Quality Monitoring</div>
          </div>
        </div>

        {/* Hamburger Icon (visible on mobile) */}
        <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <X size={28} color="#0667f5" /> : <Menu size={28} color="#0667f5" />}
        </button>

        {/* Navigation – with class for open/closed */}
        <nav className={`main-nav ${isMenuOpen ? 'open' : ''}`}>
          {/* Changed to route to /about */}
          <a onClick={() => { navigate('/about'); closeMenu(); }} style={{ cursor: 'pointer' }}>
            ABOUT
          </a>

          <button
            className="noah-btn noah-btn-primary"
            onClick={() => { navigate('/login'); closeMenu(); }}
          >
            LOGIN
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;