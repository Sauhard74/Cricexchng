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
  const [odds, setOdds] = useState(null);
  const [selectedBackLay, setSelectedBackLay] = useState(null);

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

  // Handle Selection for Back and Lay
  const handleSelectBet = (selectedTeam, selectedOdds, type) => {
    setTeam(selectedTeam);
    setOdds(selectedOdds);
    setBetType(type);

    setSelectedBackLay(prev => {
        const newBackLay = { team: selectedTeam, type, odds: selectedOdds };
        
        // Ensure calculation happens after state update
        calculatePotentialWinnings(newBackLay, selectedOdds);
        return newBackLay;
    });
};

const calculatePotentialWinnings = (backLay, odds) => {
  if (!amount || amount === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setPotentialWinnings(0);
      return;
  }

  const betAmount = parseFloat(amount);
  
  if (backLay) {
      if (backLay.type === 'back') {
          // For back bet - potential profit = stake * (odds - 1)
          const profit = betAmount * (parseFloat(backLay.odds) - 1);
          setPotentialWinnings(profit.toFixed(2));
      } else if (backLay.type === 'lay') {
          // For lay bet:
          // - Potential profit = stake (what you can win)
          // - Liability = stake * (odds - 1) (what you can lose)
          setPotentialWinnings(betAmount.toFixed(2));
      }
  } else if (betType === 'winner') {
      // Standard match winner bet - potential profit = stake * (odds - 1)
      const selectedOdds = parseFloat(odds);
      if (!isNaN(selectedOdds)) {
          const profit = betAmount * (selectedOdds - 1);
          setPotentialWinnings(profit.toFixed(2));
      }
  } else if (betType === 'runs' || betType === 'wickets') {
      // Standard profit calculation for prediction bets
      const profit = betAmount * 1.9; // Typically prediction bets pay 1.9x stake
      setPotentialWinnings(profit.toFixed(2));
  }
};

// Ensure calculation only happens after state updates
useEffect(() => {
  calculatePotentialWinnings(selectedBackLay, odds);
}, [odds, amount, betType, selectedBackLay]);

useEffect(() => {
  if (!matchDetails || !team || !amount || amount === '' || isNaN(parseFloat(amount))) {
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
    const winnings = betType === 'lay'
? parseFloat(amount) * (odds - 1)  // Liability calculation for Lay
: parseFloat(amount) * odds;
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

  // Handle placing the bet after confirmation
  const handlePlaceBet = async () => {
    try {
      if (!validateBet()) {
        return;
      }

      // Create bet data object based on bet type
      const betData = {
        matchId: matchId,
        team,
        amount: parseFloat(amount)
      };

      // Add type-specific fields
      if (selectedBackLay) {
        // Back/Lay bet
        betData.betType = selectedBackLay.type;
        betData.odds = parseFloat(selectedBackLay.odds);
        
        // Calculate liability for lay bets
        if (selectedBackLay.type === 'lay') {
          betData.liability = parseFloat(amount) * (parseFloat(selectedBackLay.odds) - 1);
        }
      } else if (betType === 'runs' || betType === 'wickets') {
        // Runs/Wickets prediction bet
        betData.betType = betType;
        betData.predictionValue = parseFloat(predictionValue);
      } else {
        // Standard winner bet
        betData.betType = 'winner';
      }

      console.log('Placing bet with data:', betData);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/bet/place`,
        betData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local user credits after successful bet
      setUserCredits(prev => prev - parseFloat(amount));
      
      // Reset form after successful bet
      setAmount('');
      setTeam('');
      setSelectedBackLay(null);
      setPredictionValue('');
      
      alert('Bet placed successfully!');
      navigate('/'); // Redirect to home page
    } catch (error) {
      console.error('Error placing bet:', error);
      alert(error.response?.data?.error || 'Failed to place bet');
    }
  };

  // Validate the bet inputs
  const validateBet = () => {
    if (!amount || amount === '' || parseFloat(amount) <= 0) {
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
    
    if (!selectedBackLay && (betType === 'runs' || betType === 'wickets') && !predictionValue) {
      alert(`Please enter a prediction for ${betType}`);
      return false;
    }
    
    return true;
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
      {/* Match Details */}
      <div className="match-header">
        <h2>🏏 {matchDetails.home_team} vs {matchDetails.away_team}</h2>
        <p className="match-date">📅 {formatMatchDate(matchDetails.scheduled)}</p>
        <p className="match-venue">📍 {matchDetails.venue || 'TBD'}</p>
      </div>
      
      {/* User Credits */}
      <div className="user-credits">
        <p>💰 Your Credits: <strong>{userCredits}</strong></p>
      </div>
      
      {/* Bookmaker Info */}
      <div className="bookmaker-info">
        <p>📊 Odds provided by: <strong>{matchDetails.bookmaker}</strong></p>
        <p>⏰ Last updated: <strong>{lastUpdate.toLocaleTimeString()}</strong></p>
      </div>

      {/* Back/Lay Explanation */}
      <div className="betting-explainer">
        <h3>Back & Lay Betting Explained</h3>
        <div className="betting-explanation-grid">
          <div className="back-explanation-box">
            <h4>Back Bet</h4>
            <p>When you "back" a team, you're betting that they <strong>will win</strong>.</p>
            <p>Example: Back {matchDetails?.home_team} @ {matchDetails?.home_odds}</p>
            <p>If {matchDetails?.home_team} wins, you win your stake × (odds - 1)</p>
          </div>
          <div className="lay-explanation-box">
            <h4>Lay Bet</h4>
            <p>When you "lay" a team, you're betting that they <strong>will NOT win</strong>.</p>
            <p>Example: Lay {matchDetails?.home_team} @ {(parseFloat(matchDetails?.home_odds) + 0.1).toFixed(2)}</p>
            <p>You win your stake if {matchDetails?.home_team} loses, but risk liability (stake × (odds - 1)) if they win.</p>
          </div>
        </div>
      </div>

      {/* Back and Lay Table - Improved with 4 distinct options */}
      <div className="back-lay-table">
        <h3>Back/Lay Betting Options</h3>
        <div className="back-lay-grid">
            <div className="back-lay-team-header">{matchDetails?.home_team}</div>
            <div className="back-lay-team-header">{matchDetails?.away_team}</div>
            
            {/* First row: Lay home, Back home */}
            <div className="back-lay-row">
                <div 
                    className={`lay-box ${selectedBackLay && selectedBackLay.team === matchDetails.home_team && selectedBackLay.type === 'lay' ? 'selected' : ''}`}
                    onClick={() => handleSelectBet(matchDetails.home_team, (parseFloat(matchDetails.home_odds) + 0.1).toFixed(2), 'lay')}
                >
                    <div className="bet-type-label">Lay</div>
                    <div className="odds-value">{(parseFloat(matchDetails.home_odds) + 0.1).toFixed(2)}</div>
                </div>
                
                <div 
                    className={`back-box ${selectedBackLay && selectedBackLay.team === matchDetails.home_team && selectedBackLay.type === 'back' ? 'selected' : ''}`}
                    onClick={() => handleSelectBet(matchDetails.home_team, matchDetails.home_odds, 'back')}
                >
                    <div className="bet-type-label">Back</div>
                    <div className="odds-value">{matchDetails?.home_odds}</div>
                </div>
            </div>
            
            {/* Second row: Lay away, Back away */}
            <div className="back-lay-row">
                <div 
                    className={`lay-box ${selectedBackLay && selectedBackLay.team === matchDetails.away_team && selectedBackLay.type === 'lay' ? 'selected' : ''}`}
                    onClick={() => handleSelectBet(matchDetails.away_team, (parseFloat(matchDetails.away_odds) + 0.1).toFixed(2), 'lay')}
                >
                    <div className="bet-type-label">Lay</div>
                    <div className="odds-value">{(parseFloat(matchDetails.away_odds) + 0.1).toFixed(2)}</div>
                </div>
                
                <div 
                    className={`back-box ${selectedBackLay && selectedBackLay.team === matchDetails.away_team && selectedBackLay.type === 'back' ? 'selected' : ''}`}
                    onClick={() => handleSelectBet(matchDetails.away_team, matchDetails.away_odds, 'back')}
                >
                    <div className="bet-type-label">Back</div>
                    <div className="odds-value">{matchDetails?.away_odds}</div>
                </div>
            </div>
        </div>
        
        {selectedBackLay && (
            <div className="selected-bet-info">
                <p>Selected: <strong>{selectedBackLay.type === 'back' ? 'Back' : 'Lay'} {selectedBackLay.team}</strong> @ <strong>{selectedBackLay.odds}</strong></p>
                {selectedBackLay.type === 'lay' && (
                    <p>Liability: <strong>{(parseFloat(amount || 0) * (parseFloat(selectedBackLay.odds) - 1)).toFixed(2)}</strong></p>
                )}
            </div>
        )}
    </div>
    
      {/* Amount */}
      <div className="bet-amount-section">
        <h3>💵 Bet Amount:</h3>
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            const inputValue = e.target.value;
            // Allow empty input (clearing the field)
            if (inputValue === '') {
              setAmount('');
              return;
            }
            
            // Don't parse the value until it's needed for validation
            // This prevents conversion issues that could change the input
            if (parseFloat(inputValue) > userCredits) {
              alert('Amount cannot exceed available credits');
              return;
            }
            
            // Simply set the input value directly
            setAmount(inputValue);
          }}
          placeholder="Enter amount"
          min="0"
          max={userCredits}
        />
      </div>

      {/* Potential Winnings */}
      {amount && potentialWinnings > 0 && (
        <div className="potential-winnings">
          <h3>{selectedBackLay && selectedBackLay.type === 'lay' ? '🏆 Potential Profit:' : '🏆 Potential Winnings:'}</h3>
          <p className="winnings-amount">{potentialWinnings}</p>
        </div>
      )}
      
      {/* Display Liability for Lay bets */}
      {selectedBackLay && selectedBackLay.type === 'lay' && amount > 0 && (
        <div className="potential-liability">
          <h3>⚠️ Your Liability:</h3>
          <p className="liability-amount">{(parseFloat(amount) * (parseFloat(selectedBackLay.odds) - 1)).toFixed(2)}</p>
        </div>
      )}

      {/* Bet Type */}
      <div className="bet-type-section">
        <h3>💰 Bet Type:</h3>
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
          <h3>🔹 {betType === 'runs' ? 'Predict Total Runs:' : 'Predict Total Wickets:'}</h3>
          <input
            type="number"
            value={predictionValue}
            onChange={(e) => setPredictionValue(e.target.value)}
            placeholder={betType === 'runs' ? 'Enter runs' : 'Enter wickets'}
            min="0"
          />
        </div>
      )}

      {/* Place Bet Button */}
      <button 
        className="place-bet-button"
        onClick={handleOpenConfirmation}
        disabled={!amount || amount === '' || parseFloat(amount) <= 0 || !team || parseFloat(amount) > userCredits}
      >
        Place Bet
      </button>

      {/* Bet Confirmation Modal */}
      {showConfirmation && (
        <BetConfirmationModal
          matchDetails={matchDetails}
          betDetails={{
            team,
            amount,
            betType: selectedBackLay ? selectedBackLay.type : betType,
            predictionValue,
            potentialWinnings,
            odds: selectedBackLay ? selectedBackLay.odds : null,
            liability: selectedBackLay && selectedBackLay.type === 'lay' ? 
              parseFloat(amount) * (parseFloat(selectedBackLay.odds) - 1) : null
          }}
          onConfirm={handlePlaceBet}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
    </div>
  );
};

export default BettingPage;