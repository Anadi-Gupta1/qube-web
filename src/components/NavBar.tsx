import { Link } from 'react-router-dom';
import './NavBar.css';

function NavBar() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          QUBES
        </Link>
        <div className="nav-menu">
          <Link to="/login" className="nav-link">
            Login
          </Link>
          <Link to="/signup" className="nav-link nav-signup">
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
