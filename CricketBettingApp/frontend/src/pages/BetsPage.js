import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/BetsPage.css';

const BetsPage = () => {
  const [bets, setBets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'won', 'lost'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBets = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('You need to be logged in to view your bets.');
          setIsLoading(false);
          return;
        }
        
        console.log('Fetching profile from:', `${process.env.REACT_APP_API_URL}/api/user/profile`);
        
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/user/profile`,
          { 
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000 // 10 second timeout
          }
        );
        
        console.log('Profile API response:', response.data);
        
        if (response.data && Array.isArray(response.data.bets)) {
          setBets(response.data.bets);
        } else {
          console.error('API returned data without bets array:', response.data);
          setBets([]);
          setError('No bet history available.');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching bets:', error);
        
        if (error.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again later.');
        } else if (error.response?.status === 404) {
          setError('Bet history is not available at the moment.');
        } else if (error.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError(error.response?.data?.message || 'Failed to load your bets. Please try again later.');
        }
        
        setBets([]);
        setIsLoading(false);
      }
    };

    fetchBets();
  }, []);

  // Sort and filter bets
  const getSortedAndFilteredBets = () => {
    const filtered = bets.filter(bet => {
      if (filter === 'all') return true;
      return bet.status?.toLowerCase() === filter;
    });
    
    return filtered.sort((a, b) => {
      // Convert dates for comparison
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      
      // Sort based on the selected order
      return sortOrder === 'asc' 
        ? dateA - dateB 
        : dateB - dateA;
    });
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
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

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

  const handleRowClick = (bet) => {
    if (bet._id) {
      navigate(`/bet/${bet._id}`);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    // Force re-render which will trigger the useEffect again
    setBets([]);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Format bet type with emoji and text
  const formatBetType = (betType) => {
    switch (betType) {
      case 'back':
        return <span className="bet-type back">📈 Back</span>;
      case 'lay':
        return <span className="bet-type lay">📉 Lay</span>;
      case 'winner':
        return <span className="bet-type winner">🏆 Winner</span>;
      case 'runs':
        return <span className="bet-type runs">🏏 Runs</span>;
      case 'wickets':
        return <span className="bet-type wickets">🎯 Wickets</span>;
      default:
        return <span className="bet-type">{betType}</span>;
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
  const getTeamColorStyle = (teamName) => {
    const teamColor = getTeamColor(teamName);
    const backgroundColor = teamColor ? `${teamColor}33` : 'rgba(0,0,0,0.1)';
    const textColor = teamColor || '#333333';
    
    return {
      backgroundColor: backgroundColor,
      color: textColor,
      borderLeft: teamColor ? `4px solid ${teamColor}` : '4px solid transparent',
      padding: '8px 12px',
      display: 'inline-block',
      width: 'auto',
      textShadow: 'none',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderRadius: '4px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      fontSize: '14px'
    };
  };

  // Format match ID to be more readable
  const formatMatchId = (matchId) => {
    if (!matchId) return 'Unknown match';
    
    // Format the match ID to be more readable
    let formattedMatchId = matchId;
    if (formattedMatchId.includes('match_')) {
      formattedMatchId = formattedMatchId.replace('match_', 'Match ');
    }
    
    // Clean up underscores and make it more readable
    formattedMatchId = formattedMatchId
      .replace(/_/g, ' ')
      .replace(/(\d{4})(\w+)(\d{4})/, '$1 vs $3');
    
    return formattedMatchId;
  };

  // Get the sorted and filtered bets
  const filteredBets = getSortedAndFilteredBets();

  if (isLoading) {
    return (
      <div className="bets-page-container">
        <div className="bets-card">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading your bets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bets-page-container">
        <div className="bets-card">
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
            <button className="retry-button" onClick={handleRetry}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bets-page-container">
      <div className="bets-card">
        <div className="bets-header">
          <div className="header-top-row">
            <h1>My Bets</h1>
            <div className="sort-control">
              <button 
                className="sort-btn" 
                onClick={toggleSortOrder}
                title={`Currently: ${sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}`}
              >
                <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}-alt`}></i>
                {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              </button>
            </div>
          </div>
          <div className="filter-options">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} 
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button 
              className={`filter-btn ${filter === 'won' ? 'active' : ''}`} 
              onClick={() => setFilter('won')}
            >
              Won
            </button>
            <button 
              className={`filter-btn ${filter === 'lost' ? 'active' : ''}`} 
              onClick={() => setFilter('lost')}
            >
              Lost
            </button>
            <button 
              className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`} 
              onClick={() => setFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
        </div>

        {filteredBets.length > 0 ? (
          <div className="bets-table-container" style={{backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden'}}>
            <table className="bets-table" style={{backgroundColor: 'white', width: '100%'}}>
              <thead>
                <tr>
                  <th style={{backgroundColor: '#1e293b', color: 'white', padding: '1rem'}}>MATCH</th>
                  <th style={{backgroundColor: '#1e293b', color: 'white', padding: '1rem'}}>TEAM</th>
                  <th style={{backgroundColor: '#1e293b', color: 'white', padding: '1rem'}}>BET TYPE</th>
                  <th style={{backgroundColor: '#1e293b', color: 'white', padding: '1rem'}}>ODDS</th>
                  <th style={{backgroundColor: '#1e293b', color: 'white', padding: '1rem'}}>AMOUNT</th>
                  <th style={{backgroundColor: '#1e293b', color: 'white', padding: '1rem'}}>
                    DATE
                  </th>
                  <th style={{backgroundColor: '#1e293b', color: 'white', padding: '1rem'}}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredBets.map((bet, index) => {                  
                  const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                  
                  return (
                    <tr 
                      key={bet._id || Math.random().toString()} 
                      onClick={() => handleRowClick(bet)}
                      style={{
                        backgroundColor: rowBgColor,
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      <td style={{backgroundColor: rowBgColor, color: '#333', padding: '1rem'}}>
                        <div className="match-info">
                          <span className="match-teams">{formatMatchId(bet.matchId)}</span>
                        </div>
                      </td>
                      <td style={{backgroundColor: rowBgColor, color: '#333', padding: '1rem'}}>
                        <span 
                          className="team-name" 
                          style={getTeamColorStyle(bet.team)}
                        >
                          {bet.team || 'Unknown'}
                        </span>
                      </td>
                      <td style={{backgroundColor: rowBgColor, color: '#333', padding: '1rem'}}>
                        {formatBetType(bet.betType)}
                      </td>
                      <td style={{backgroundColor: rowBgColor, color: '#333', padding: '1rem'}}>
                        {bet.odds ? parseFloat(bet.odds).toFixed(2) : (bet.betType === 'runs' || bet.betType === 'wickets' ? bet.predictionValue : '-')}
                      </td>
                      <td style={{backgroundColor: rowBgColor, color: '#333', padding: '1rem'}}>
                        <span className="bet-amount">₹{(bet.amount || 0).toLocaleString()}</span>
                      </td>
                      <td style={{backgroundColor: rowBgColor, color: '#333', padding: '1rem'}}>{bet.createdAt ? formatDate(bet.createdAt) : 'N/A'}</td>
                      <td style={{backgroundColor: rowBgColor, padding: '1rem'}}>
                        <span className={`bet-status ${getStatusClass(bet.status)}`}>
                          {bet.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-bets-message">
            <i className="fas fa-search"></i>
            <p>No bets found for the selected filter.</p>
            {filter !== 'all' && (
              <button 
                className="show-all-btn" 
                onClick={() => setFilter('all')}
              >
                Show All Bets
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BetsPage;
