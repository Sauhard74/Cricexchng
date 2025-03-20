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
            <div className="social-links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i className="social-icon">📘</i>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <i className="social-icon">🐦</i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i className="social-icon">📸</i>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <i className="social-icon">📺</i>
              </a>
            </div>
          </div>

          <div className="footer-column">
            <h3>Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/live-scores">Live Scores</Link></li>
              <li><Link to="/promotions">Promotions</Link></li>
              <li><Link to="/cricket/leagues">Leagues</Link></li>
              <li><Link to="/profile">My Account</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Support</h3>
            <ul className="footer-links">
              <li><Link to="/help">Help Center</Link></li>
              <li><Link to="/faq">FAQs</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/responsible-gambling">Responsible Gambling</Link></li>
              <li><Link to="/payment-methods">Payment Methods</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Download Our App</h3>
            <p className="app-desc">Get the best betting experience on your mobile device</p>
            <div className="app-buttons">
              <a href="#" className="app-button">
                <i className="app-icon">📱</i>
                <div className="app-text">
                  <span className="app-store-text">Download on the</span>
                  <span className="app-store-name">App Store</span>
                </div>
              </a>
              <a href="#" className="app-button">
                <i className="app-icon">🤖</i>
                <div className="app-text">
                  <span className="app-store-text">Get it on</span>
                  <span className="app-store-name">Google Play</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-middle">
          <div className="payment-methods">
            <span className="payment-title">Payment Methods:</span>
            <div className="payment-icons">
              <i className="payment-icon">💳</i>
              <i className="payment-icon">🏦</i>
              <i className="payment-icon">💰</i>
              <i className="payment-icon">💲</i>
            </div>
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
