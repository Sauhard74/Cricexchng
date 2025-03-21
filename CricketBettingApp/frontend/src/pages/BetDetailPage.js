import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/BetDetailPage.css';

const BetDetailPage = () => {
  const { betId } = useParams();
  const [betDetails, setBetDetails] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBetDetails = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('You need to be logged in to view bet details.');
          setIsLoading(false);
          return;
        }
        
        // Get user profile which contains all bets
        const profileResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/user/profile`,
          { 
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          }
        );
        
        console.log('Profile data:', profileResponse.data);
        
        if (profileResponse.data && Array.isArray(profileResponse.data.bets)) {
          // Find the specific bet by ID
          const bet = profileResponse.data.bets.find(b => b._id === betId);
          
          if (bet) {
            console.log('Found bet details:', bet);
            setBetDetails(bet);
            
            // Now fetch the match details
            if (bet.matchId) {
              try {
                const matchResponse = await axios.get(
                  `${process.env.REACT_APP_API_URL}/api/match/${bet.matchId}`,
                  { timeout: 10000 }
                );
                
                console.log('Match details:', matchResponse.data);
                setMatchDetails(matchResponse.data);
              } catch (matchError) {
                console.error('Error fetching match details:', matchError);
                // Even if match details fail, we can still show the bet
                // Just create a placeholder match with team names from the bet
                setMatchDetails({
                  home_team: bet.team,
                  away_team: bet.team === profileResponse.data.bets[0].team ? 'Opponent' : profileResponse.data.bets[0].team,
                  status: 'unknown'
                });
              }
            }
          } else {
            setError('Bet not found in your history');
          }
        } else {
          setError('No bet history available in your profile');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        
        if (error.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again later.');
        } else if (error.response?.status === 404) {
          setError('Profile not found.');
        } else if (error.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError(error.response?.data?.message || 'Failed to load bet details. Please try again later.');
        }
        
        setIsLoading(false);
      }
    };

    fetchBetDetails();
  }, [betId]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    
    switch (status.toLowerCase()) {
      case 'won':
        return 'status-won';
      case 'lost':
        return 'status-lost';
      case 'pending':
        return 'status-pending';
      default:
        return '';
    }
  };

  // Function to get team color based on name
  const getTeamColor = (teamName) => {
    if (!teamName) return null;
    
    const teamNameLower = teamName.toLowerCase();
    
    if (teamNameLower.includes('royal challengers') || teamNameLower.includes('bangalore') || teamNameLower.includes('rcb')) {
      return '#e00000';
    } else if (teamNameLower.includes('chennai') || teamNameLower.includes('super kings') || teamNameLower.includes('csk')) {
      return '#ffcc00';
    } else if (teamNameLower.includes('kolkata') || teamNameLower.includes('knight riders') || teamNameLower.includes('kkr')) {
      return '#7b3fe4';
    } else if (teamNameLower.includes('mumbai') || teamNameLower.includes('indians') || teamNameLower.includes('mi')) {
      return '#004c93';
    } else if (teamNameLower.includes('delhi') || teamNameLower.includes('capitals') || teamNameLower.includes('dc')) {
      return '#0078bc';
    } else if (teamNameLower.includes('rajasthan') || teamNameLower.includes('royals') || teamNameLower.includes('rr')) {
      return '#ff69b4';
    } else if (teamNameLower.includes('sunrisers') || teamNameLower.includes('hyderabad') || teamNameLower.includes('srh')) {
      return '#ff8c00';
    } else if (teamNameLower.includes('punjab') || teamNameLower.includes('kings') || teamNameLower.includes('pbks')) {
      return '#ed1c24';
    } else if (teamNameLower.includes('lucknow') || teamNameLower.includes('super giants') || teamNameLower.includes('lsg')) {
      return '#00bfff';
    } else if (teamNameLower.includes('gujarat') || teamNameLower.includes('titans') || teamNameLower.includes('gt')) {
      return '#566573';
    }
    
    return null;
  };

  // Function to create team name style
  const getTeamColorStyle = (teamName, isSelected = false) => {
    const teamColor = getTeamColor(teamName);
    const backgroundColor = teamColor ? `${teamColor}33` : 'rgba(0,0,0,0.1)';
    const textColor = teamColor || '#333333';
    
    return {
      backgroundColor: backgroundColor,
      color: textColor,
      borderLeft: teamColor ? `4px solid ${teamColor}` : '4px solid transparent',
      padding: '10px 15px',
      display: 'block',
      width: '100%',
      textShadow: 'none',
      boxShadow: isSelected ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
      borderRadius: '6px',
      fontWeight: 'bold',
      marginBottom: '8px',
      border: isSelected ? `1px solid ${teamColor || '#3b82f6'}` : 'none',
      transition: 'all 0.3s ease'
    };
  };

  if (isLoading) {
    return (
      <div className="bet-detail-container">
        <div className="bet-detail-card">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading bet details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bet-detail-container">
        <div className="bet-detail-card">
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
            <button className="back-button" onClick={() => navigate('/bets')}>
              Back to My Bets
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If we don't have bet details
  if (!betDetails) {
    return (
      <div className="bet-detail-container">
        <div className="bet-detail-card">
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <p>Unable to load bet details.</p>
            <button className="back-button" onClick={() => navigate('/bets')}>
              Back to My Bets
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If we have bet details but no match details, we can still show some information
  const selectedTeamOdds = matchDetails 
    ? (betDetails.team === matchDetails.home_team ? matchDetails.home_odds : matchDetails.away_odds) 
    : 1.5; // Default odds if we don't have match details

  const potentialWinnings = (parseFloat(betDetails.amount) * parseFloat(selectedTeamOdds)).toFixed(2);

  return (
    <div className="bet-detail-container">
      <div className="bet-detail-card">
        <div className="bet-detail-header">
          <button className="back-link" onClick={() => navigate('/bets')}>
            <i className="fas fa-arrow-left"></i> Back to My Bets
          </button>
          <h1>Bet Details</h1>
        </div>

        <div className="bet-detail-content">
          {/* Match Information */}
          <div className="match-info-section">
            <h2>Match Information</h2>
            {matchDetails ? (
              <>
                <div className="match-teams">
                  <div className={`team ${betDetails.team === matchDetails.home_team ? 'selected' : ''}`}>
                    <span 
                      className="team-name"
                      style={getTeamColorStyle(matchDetails.home_team, betDetails.team === matchDetails.home_team)}
                    >
                      {matchDetails.home_team}
                    </span>
                    {betDetails.team === matchDetails.home_team && <span className="your-pick">Your Pick</span>}
                  </div>
                  <span className="vs">VS</span>
                  <div className={`team ${betDetails.team === matchDetails.away_team ? 'selected' : ''}`}>
                    <span 
                      className="team-name"
                      style={getTeamColorStyle(matchDetails.away_team, betDetails.team === matchDetails.away_team)}
                    >
                      {matchDetails.away_team}
                    </span>
                    {betDetails.team === matchDetails.away_team && <span className="your-pick">Your Pick</span>}
                  </div>
                </div>
                
                <div className="match-details">
                  {matchDetails.scheduled && (
                    <div className="detail-item">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{formatDate(matchDetails.scheduled)}</span>
                    </div>
                  )}
                  {matchDetails.venue && (
                    <div className="detail-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{matchDetails.venue || 'Venue not specified'}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <i className="fas fa-info-circle"></i>
                    <span>Match Status: {matchDetails.status}</span>
                  </div>
                  {matchDetails.match_winner && (
                    <div className="detail-item winner">
                      <i className="fas fa-trophy"></i>
                      <span>Winner: {matchDetails.match_winner}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="simple-match-view">
                <p>Match details could not be loaded</p>
                <div className="team-simple">
                  <strong>Your Team:</strong> {betDetails.team}
                </div>
              </div>
            )}
          </div>

          {/* Bet Information */}
          <div className="bet-info-section">
            <h2>Bet Information</h2>
            <div className="bet-details">
              <div className="bet-detail-item">
                <span className="label">Bet ID:</span>
                <span className="value">{betDetails._id}</span>
              </div>
              <div className="bet-detail-item">
                <span className="label">Date Placed:</span>
                <span className="value">{formatDate(betDetails.createdAt)}</span>
              </div>
              <div className="bet-detail-item">
                <span className="label">Team:</span>
                <span 
                  className="value team-name"
                  style={getTeamColorStyle(betDetails.team, true)}
                >
                  {betDetails.team}
                </span>
              </div>
              <div className="bet-detail-item">
                <span className="label">Amount:</span>
                <span className="value">₹{parseFloat(betDetails.amount).toLocaleString()}</span>
              </div>
              <div className="bet-detail-item">
                <span className="label">Odds:</span>
                <span className="value">{parseFloat(selectedTeamOdds).toFixed(2)}</span>
              </div>
              <div className="bet-detail-item">
                <span className="label">Potential Winnings:</span>
                <span className="value winnings">₹{potentialWinnings}</span>
              </div>
              <div className="bet-detail-item status">
                <span className="label">Status:</span>
                <span className={`value bet-status ${getStatusClass(betDetails.status)}`}>
                  {betDetails.status}
                </span>
              </div>
            </div>
          </div>

          {/* If match is completed, show result */}
          {matchDetails && (matchDetails.status === 'closed' || matchDetails.status === 'finished') && (
            <div className="match-result-section">
              <h2>Match Result</h2>
              <div className="match-result">
                {matchDetails.home_score && matchDetails.away_score && (
                  <div className="score">
                    <span className="home-team">{matchDetails.home_team}</span>
                    <span className="score-value">{matchDetails.home_score} - {matchDetails.away_score}</span>
                    <span className="away-team">{matchDetails.away_team}</span>
                  </div>
                )}
                {matchDetails.match_winner && (
                  <div className="winner-display">
                    <i className="fas fa-trophy"></i>
                    <span>{matchDetails.match_winner} won the match</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA to place another bet */}
          <div className="bet-again-section">
            <button className="bet-again-button" onClick={() => navigate('/')}>
              Place Another Bet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetDetailPage; 