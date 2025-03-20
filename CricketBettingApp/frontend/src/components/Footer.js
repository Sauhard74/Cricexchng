import "../styles/components/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} Cricket Betting. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
