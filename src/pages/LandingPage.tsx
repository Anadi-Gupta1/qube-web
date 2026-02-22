import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css'

function LandingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  return (
    <div className="landing-container">
      <iframe 
        src='https://my.spline.design/prismcoin-SrRijy1wSjFVteIEDUMfs7k8/' 
        frameBorder='0' 
        width='100%' 
        height='100%'
        title="3D Prism Coin Model"
      />
      <div className="logo-cover"></div>
    </div>
  );
}

export default LandingPage;
