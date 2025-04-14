import React, { useState } from 'react';
import './Navbar.css'; // Importing CSS file for styles

const Navbar = () => {
  const [visible, setVisible] = useState(true);

  return (
    <nav className="navbar">
      <div className="container">
      
       
        <div className={`navbar-collapse ${visible ? 'show' : ''}`}>
          <ul className="navbar-nav">
            <li className="nav-item">
              <a href="/" className="nav-link active">Home</a>
            </li>
            <li className="nav-item">
              <a href="/kernel" className="nav-link">Image Kernels</a>
            </li>
            <li className="nav-item">
              <a href="/FeatureMaps" className="nav-link">Feature Maps</a>
            </li>
            <li className="nav-item dropdown">
              <a href="#" className="nav-link dropdown-toggle">Dropdown link</a>
              <div className="dropdown-menu">
                <a href="#" className="dropdown-item">Action</a>
                <a href="#" className="dropdown-item">Another action</a>
                <div className="dropdown-divider"></div>
                <a href="#" className="dropdown-item">Something else here</a>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
