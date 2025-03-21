import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/BettingPage.css';
import BetConfirmationModal from '../components/BetConfirmationModal';
import { wsService } from '../services/websocketService';

const formatMatchDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Date not available';
  }
};

const BettingPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const preferredBookmaker = searchParams.get('bookmaker');
  
  console.log('BettingPage mounted');
  console.log('Raw matchId from params:', matchId);
  console.log('Preferred bookmaker:', preferredBookmaker);

  const [matchDetails, setMatchDetails] = useState(null);
  const [betType, setBetType] = useState('winner');
  const [predictionValue, setPredictionValue] = useState('');
  const [team, setTeam] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [potentialWinnings, setPotentialWinnings] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userCredits, setUserCredits] = useState(0);

  // Add polling interval state
  const [pollingInterval, setPollingInterval] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Separate data fetching function
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Convert any special encoding back to slashes
      const decodedMatchId = matchId.replace(/___/g, '/');
      
      // Get the auth token
      const token = localStorage.getItem('token');
      
      // Make the API request with the auth token
      const matchResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/betting/${encodeURIComponent(decodedMatchId)}`,
        { 
          params: { bookmaker: preferredBookmaker },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 10000
        }
      );
      
      // Update match details and last update time
      setMatchDetails(matchResponse.data);
      setLastUpdate(new Date());
      
      // Fetch user profile to get accurate credits
      if (token) {
        const userResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/user/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUserCredits(userResponse.data.credits);
      } else {
        setUserCredits(matchResponse.data.userCredits || 1000);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError(error.response?.data?.error || 'Failed to load data');
      setLoading(false);
    }
  };

  // Effect for initial load and polling
  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();

    // Subscribe to odds updates
    const unsubscribe = wsService.subscribe((newOdds) => {
      console.log('Received WebSocket update:', newOdds);
      
      if (matchId && matchDetails) {
        // First decode the matchId from the URL
        const decodedMatchId = matchId.replace(/___/g, '/');
        
        // Find the odds for this specific match
        const updatedOdds = newOdds.find(odds => {
          // Compare with the decoded matchId
          return odds.matchId === decodedMatchId;
        });
        
        if (updatedOdds) {
          console.log('Found updated odds for this match:', updatedOdds);
          setMatchDetails(prev => ({
            ...prev,
            home_odds: updatedOdds.homeOdds,
            away_odds: updatedOdds.awayOdds,
            bookmaker: updatedOdds.bookmaker,
            lastUpdated: new Date()
          }));
          setLastUpdate(new Date());
        }
      }
    });

    // Initial fetch
    if (matchId) {
      fetchData();
    }

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [matchId, preferredBookmaker]);

  // Calculate potential winnings whenever team or amount changes
  useEffect(() => {
    if (!matchDetails || !team || !amount) {
      setPotentialWinnings(0);
      return;
    }

    try {
      // Get the odds for the selected team
      let odds = team === matchDetails.home_team 
        ? matchDetails.home_odds 
        : matchDetails.away_odds;
      
      // Ensure odds is a number
      odds = parseFloat(odds);
      
      // Check if odds is a valid number
      if (isNaN(odds)) {
        console.error('Invalid odds value:', odds);
        setPotentialWinnings(0);
        return;
      }
      
      // Calculate winnings
      const winnings = parseFloat(amount) * odds;
      setPotentialWinnings(winnings.toFixed(2));
    } catch (error) {
      console.error('Error calculating potential winnings:', error);
      setPotentialWinnings(0);
    }
  }, [team, amount, matchDetails]);

  // Handle opening the confirmation modal
  const handleOpenConfirmation = () => {
    if (!validateBet()) return;
    setShowConfirmation(true);
  };

  // Validate the bet inputs
  const validateBet = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid bet amount');
      return false;
    }
    
    if (parseFloat(amount) > userCredits) {
      alert('Insufficient credits for this bet');
      return false;
    }
    
    if (!team) {
      alert('Please select a team');
      return false;
    }
    
    if ((betType === 'runs' || betType === 'wickets') && !predictionValue) {
      alert(`Please enter a prediction for ${betType}`);
      return false;
    }
    
    return true;
  };

  // Handle placing the bet after confirmation
  const handlePlaceBet = async () => {
    try {
      if (!amount || !team) {
        alert('Please select a team and enter an amount');
        return;
      }

      if (parseFloat(amount) > userCredits) {
        alert('Insufficient credits');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/bet/place`,
        {
          matchId: matchId, // Remove the double decoding here as well
          team,
          amount: parseFloat(amount),
          betType: 'winner'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local user credits after successful bet
      setUserCredits(prev => prev - parseFloat(amount));
      alert('Bet placed successfully!');
      navigate('/'); // Redirect to home page
    } catch (error) {
      console.error('Error placing bet:', error);
      alert(error.response?.data?.error || 'Failed to place bet');
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading match details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!matchDetails) {
    return <div className="error-message">Match not found</div>;
  }

  return (
    <div className="betting-page">
      {/* Match Details Header */}
      <div className="match-header">
        <h2>{matchDetails.home_team} vs {matchDetails.away_team}</h2>
        <div className="match-info">
          <p className="match-date">
            <i className="fas fa-calendar-alt"></i> {formatMatchDate(matchDetails.scheduled)}
          </p>
          <p className="match-venue">
            <i className="fas fa-map-marker-alt"></i> {matchDetails.venue || 'Venue TBD'}
          </p>
        </div>
      </div>
      
      <div className="betting-page-content">
        {/* User Credits */}
        <div className="user-credits">
          <p>Available Balance</p>
          <p><strong>{userCredits.toLocaleString()}</strong></p>
        </div>
        
        {/* Bookmaker Info */}
        <div className="bookmaker-info">
          <p><i className="fas fa-chart-line"></i> Odds by <strong>{matchDetails.bookmaker}</strong></p>
          <p><i className="fas fa-sync-alt"></i> Updated <strong>{lastUpdate.toLocaleTimeString()}</strong></p>
        </div>

        {/* Current Odds */}
        <div className="odds-container">
          <h3><i className="fas fa-trophy"></i> Select Team to Bet On</h3>
          <div className="team-odds-boxes">
            <div
              className={`odds-box ${team === matchDetails.home_team ? 'selected' : ''}`}
              onClick={() => setTeam(matchDetails.home_team)}
            >
              <span className="team-name">{matchDetails.home_team}</span>
              <span className="odds-value">
                {typeof matchDetails.home_odds === 'number' 
                  ? matchDetails.home_odds.toFixed(2) 
                  : parseFloat(matchDetails.home_odds || 0).toFixed(2)}
              </span>
            </div>
            <div
              className={`odds-box ${team === matchDetails.away_team ? 'selected' : ''}`}
              onClick={() => setTeam(matchDetails.away_team)}
            >
              <span className="team-name">{matchDetails.away_team}</span>
              <span className="odds-value">
                {typeof matchDetails.away_odds === 'number' 
                  ? matchDetails.away_odds.toFixed(2) 
                  : parseFloat(matchDetails.away_odds || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Bet Type */}
        <div className="bet-type-section">
          <h3><i className="fas fa-dice"></i> Bet Type</h3>
          <div className="bet-type-options">
            <label className={`bet-type-option ${betType === 'winner' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="betType"
                value="winner"
                checked={betType === 'winner'}
                onChange={(e) => setBetType(e.target.value)}
              />
              Match Winner
            </label>
            <label className={`bet-type-option ${betType === 'runs' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="betType"
                value="runs"
                checked={betType === 'runs'}
                onChange={(e) => setBetType(e.target.value)}
              />
              Total Runs
            </label>
            <label className={`bet-type-option ${betType === 'wickets' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="betType"
                value="wickets"
                checked={betType === 'wickets'}
                onChange={(e) => setBetType(e.target.value)}
              />
              Total Wickets
            </label>
          </div>
        </div>

        {/* Prediction Value */}
        {betType !== 'winner' && (
          <div className="prediction-input">
            <h3>
              <i className="fas fa-chart-bar"></i> 
              {betType === 'runs' ? 'Predict Total Runs' : 'Predict Total Wickets'}
            </h3>
            <input
              type="number"
              value={predictionValue}
              onChange={(e) => setPredictionValue(e.target.value)}
              placeholder={betType === 'runs' ? 'Enter runs' : 'Enter wickets'}
              min="0"
            />
          </div>
        )}

        {/* Amount */}
        <div className="bet-amount-section">
          <h3><i className="fas fa-coins"></i> Bet Amount</h3>
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0) {
                if (value <= userCredits) {
                  setAmount(e.target.value);
                } else {
                  alert('Amount cannot exceed available credits');
                }
              } else if (e.target.value === '') {
                setAmount('');
              }
            }}
            placeholder="Enter amount"
            min="1"
            max={userCredits}
          />
          
          <div className="bet-amount-quick-options">
            <button onClick={() => setAmount('100')}>₹100</button>
            <button onClick={() => setAmount('500')}>₹500</button>
            <button onClick={() => setAmount('1000')}>₹1000</button>
            <button onClick={() => setAmount(userCredits.toString())}>Max</button>
          </div>
        </div>

        {/* Potential Winnings */}
        {potentialWinnings > 0 && (
          <div className="potential-winnings">
            <h3>Potential Winnings</h3>
            <p className="winnings-amount">{potentialWinnings}</p>
          </div>
        )}

        {/* Place Bet Button */}
        <button 
          className="place-bet-button"
          onClick={handleOpenConfirmation}
          disabled={!amount || !team || parseFloat(amount) > userCredits || parseFloat(amount) <= 0}
        >
          Place Bet
        </button>
        
        {/* Betting Tips */}
        <div className="betting-tips">
          <h4><i className="fas fa-lightbulb"></i> Betting Tips</h4>
          <ul>
            <li>Odds reflect the probability of an outcome</li>
            <li>Higher odds mean higher potential returns</li>
            <li>Always bet responsibly and within your limits</li>
          </ul>
        </div>
      </div>

      {/* Bet Confirmation Modal */}
      {showConfirmation && (
        <BetConfirmationModal
          matchDetails={matchDetails}
          betDetails={{
            team,
            amount,
            betType,
            predictionValue,
            potentialWinnings
          }}
          onConfirm={handlePlaceBet}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
    </div>
  );
};

export default BettingPage;
