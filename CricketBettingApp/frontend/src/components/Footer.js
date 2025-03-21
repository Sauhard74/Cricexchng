import { Link } from 'react-router-dom';
import "../styles/components/Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-column">
            <div className="footer-logo">
              <span className="logo-icon">🏏</span>
              <span className="logo-text">CricketBets</span>
            </div>
            <p className="footer-desc">
              The ultimate platform for cricket betting enthusiasts. 
              Experience real-time odds, secure transactions, and the thrill of 
              live cricket betting.
            </p>
            
          </div>

          <div className="footer-column">
            <h3>Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
            
              <li><Link to="/cricket/leagues">Leagues</Link></li>
              <li><Link to="/profile">My Account</Link></li>
            </ul>
          </div>

        </div>


        <div className="footer-bottom">
          <p className="copyright">
            &copy; {currentYear} CricketBets. All rights reserved.
          </p>
          <div className="legal-links">
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
