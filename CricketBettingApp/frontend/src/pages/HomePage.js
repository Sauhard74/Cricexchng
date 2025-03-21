import { useEffect, useState } from 'react';
import { getLiveMatches } from '../api/apiService';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/HomePage.css';
import { wsService } from '../services/websocketService';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('live');
  const [league, setLeague] = useState('');
  const [date, setDate] = useState('');
  const navigate = useNavigate();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { isAuthenticated } = useAuth();

  // Add a helper function for formatting dates
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

  // Add this helper function after formatMatchDate
  const getTeamClass = (teamName, teamColor) => {
    // If we have a color from the API, use a dynamic style
    if (teamColor) {
      return `team-with-color-${teamName.toLowerCase().replace(/\s+/g, '-')}`;
    }
    
    // Otherwise fall back to our predefined classes
    const normalizedName = teamName.trim().toLowerCase();
    
    if (normalizedName.includes('royal challengers') || normalizedName.includes('bangalore')) {
      return 'team-royal-challengers-bangalore';
    } else if (normalizedName.includes('chennai') || normalizedName.includes('super kings')) {
      return 'team-chennai-super-kings';
    } else if (normalizedName.includes('kolkata') || normalizedName.includes('knight riders')) {
      return 'team-kolkata-knight-riders';
    } else if (normalizedName.includes('mumbai') || normalizedName.includes('indians')) {
      return 'team-mumbai-indians';
    } else if (normalizedName.includes('lucknow') || normalizedName.includes('super giants')) {
      return 'team-lucknow-super-giants';
    } else if (normalizedName.includes('gujarat') || normalizedName.includes('titans')) {
      return 'team-gujarat-titans';
    } else if (normalizedName.includes('delhi') || normalizedName.includes('capitals')) {
      return 'team-delhi-capitals';
    } else if (normalizedName.includes('rajasthan') || normalizedName.includes('royals')) {
      return 'team-rajasthan-royals';
    } else if (normalizedName.includes('sunrisers') || normalizedName.includes('hyderabad')) {
      return 'team-sunrisers-hyderabad';
    } else if (normalizedName.includes('punjab') || normalizedName.includes('kings')) {
      return 'team-punjab-kings';
    }
    
    return '';
  };

  // Fetch matches function
  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLiveMatches();
      // Ensure we're getting fresh data by completely replacing the state
      setMatches(data || []);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setError('Failed to load matches');
      setLoading(false);
      // Clear matches on error to prevent showing stale data
      setMatches([]);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMatches();

    // Set up WebSocket
    wsService.connect();
    
    // Subscribe to updates
    const unsubscribe = wsService.subscribe((updatedOdds) => {
      setMatches(prevMatches => {
        // Create a new array with only matches that exist in the updated odds
        const updatedMatches = prevMatches
          .map(match => {
            const updatedOdd = updatedOdds.find(odd => odd.matchId === match.id);
            if (updatedOdd) {
              return {
                ...match,
                home_odds: updatedOdd.homeOdds,
                away_odds: updatedOdd.awayOdds,
                bookmaker: updatedOdd.bookmaker,
                lastUpdated: new Date()
              };
            }
            return null; // Return null for matches that no longer exist
          })
          .filter(match => match !== null); // Remove null entries

        return updatedMatches;
      });
      setLastUpdate(new Date());
    });

    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchMatches();
    }, 30000); // Refresh every 30 seconds

    // Cleanup
    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  // Helper function to navigate to betting page
  const handleBetNow = (match) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/betting/${encodeURIComponent(match.id)}` } });
      return;
    }
    
    // Replace slashes with a different character to avoid URL path issues
    const safeMatchId = String(match.id).replace(/\//g, '___');
    
    // Encode the safe match ID
    const encodedMatchId = encodeURIComponent(safeMatchId);
    const encodedBookmaker = encodeURIComponent(match.bookmaker || 'DraftKings');
    
    navigate(`/betting/${encodedMatchId}?bookmaker=${encodedBookmaker}`);
  };

  // Filter matches based on active tab
  const filteredMatches = matches.filter(match => {
    if (activeTab === 'live') {
      return match.status === 'in_play' || match.status === 'started';
    } else if (activeTab === 'upcoming') {
      return match.status === 'not_started' || match.status === 'scheduled' || match.status === 'Pending' || match.status === 'pending';
    } else if (activeTab === 'recent') {
      return match.status === 'closed' || match.status === 'finished';
    }
    return true;
  });

  // Further filter by league and date if selected
  const displayedMatches = filteredMatches.filter(match => {
    let matchesLeague = true;
    let matchesDate = true;
    
    if (league) {
      matchesLeague = match.league === league;
    }
    
    if (date) {
      // Convert match scheduled time to UTC date (YYYY-MM-DD)
      const matchDate = new Date(match.scheduled);
      const matchUTCDate = new Date(
        Date.UTC(
          matchDate.getUTCFullYear(),
          matchDate.getUTCMonth(),
          matchDate.getUTCDate()
        )
      );
      const matchDateStr = matchUTCDate.toISOString().split('T')[0];
      
      // Log for debugging
      console.log(`Match ${match.id}: scheduled=${match.scheduled}, UTC date=${matchDateStr}, selected=${date}, match?=${matchDateStr === date}`);
      
      matchesDate = matchDateStr === date;
    }
    
    return matchesLeague && matchesDate;
  });

  // Get featured matches (first 3 live or upcoming matches)
  const featuredMatches = matches
    .filter(match => match.status !== 'closed' && match.status !== 'finished')
    .slice(0, 3);

  // Add a dynamic CSS style for team colors
  const getTeamColorStyle = (teamName, teamColor) => {
    if (!teamColor) return {};
    
    // Create a sanitized class name from the team name
    const className = `team-with-color-${teamName.toLowerCase().replace(/\s+/g, '-')} .team-name`;
    
    return {
      [className]: {
        color: "#000000 !important",
        textShadow: "none",
        fontWeight: 'bold',
        backgroundColor: `${teamColor} !important`,
        padding: '3px 8px',
        borderRadius: '4px',
        transition: 'all 0.3s ease'
      }
    };
  };
  
  // Generate dynamic CSS for all teams
  useEffect(() => {
    if (matches.length > 0) {
      // Create a style element
      const styleElement = document.createElement('style');
      
      // Generate CSS for each team
      const cssRules = [];
      
      matches.forEach(match => {
        if (match.home_team_color) {
          const className = `.team-with-color-${match.home_team.toLowerCase().replace(/\s+/g, '-')}`;
          cssRules.push(`
            ${className} .team-name {
              color: #000000 !important;
              text-shadow: none;
              font-weight: bold;
              background-color: ${match.home_team_color} !important;
              padding: 3px 8px;
              border-radius: 4px;
              transition: all 0.3s ease;
            }
            ${className}:hover .team-name {
              animation: team-pulse 1.5s infinite alternate ease-in-out;
              transform: translateY(-2px);
              color: #000000 !important;
              background-color: ${match.home_team_color} !important;
            }
            ${className}::before {
              background-color: ${match.home_team_color};
            }
          `);
        }
        
        if (match.away_team_color) {
          const className = `.team-with-color-${match.away_team.toLowerCase().replace(/\s+/g, '-')}`;
          cssRules.push(`
            ${className} .team-name {
              color: #000000 !important;
              text-shadow: none;
              font-weight: bold;
              background-color: ${match.away_team_color} !important;
              padding: 3px 8px;
              border-radius: 4px;
              transition: all 0.3s ease;
            }
            ${className}:hover .team-name {
              animation: team-pulse 1.5s infinite alternate ease-in-out;
              transform: translateY(-2px);
              color: #000000 !important;
              background-color: ${match.away_team_color} !important;
            }
            ${className}::before {
              background-color: ${match.away_team_color};
            }
          `);
        }
      });
      
      styleElement.textContent = cssRules.join('\n');
      document.head.appendChild(styleElement);
      
      // Clean up function
      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, [matches]);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Bet on Cricket Like Never Before</h1>
          <p>Live odds, real-time updates, and the best betting experience</p>
          <button 
            className="cta-button"
            onClick={() => navigate(isAuthenticated ? '/profile' : '/register')}
          >
            {isAuthenticated ? 'My Account' : 'Sign Up & Get Bonus'}
          </button>
        </div>
        <div className="hero-overlay"></div>
      </section>

      {/* Featured Matches */}
      {featuredMatches.length > 0 && (
        <section className="featured-matches">
          <div className="section-header">
            <h2>Featured Matches</h2>
            <span className="live-indicator">Live Updates</span>
          </div>
          <div className="featured-matches-grid">
            {featuredMatches.map((match) => (
              <div key={`featured-${match.id}`} className="featured-match-card">
                <div className="teams">
                  <div className={`team home-team ${getTeamClass(match.home_team, match.home_team_color)}`}>
                    <span className="team-name">{match.home_team}</span>
                    <span className="team-odds">{parseFloat(match.home_odds).toFixed(2)}</span>
                  </div>
                  <span className="vs">VS</span>
                  <div className={`team away-team ${getTeamClass(match.away_team, match.away_team_color)}`}>
                    <span className="team-name">{match.away_team}</span>
                    <span className="team-odds">{parseFloat(match.away_odds).toFixed(2)}</span>
                  </div>
                </div>
                <div className="match-meta">
                  <span className="match-time">{formatMatchDate(match.scheduled)}</span>
                  <span className={`match-status status-${match.status}`}>
                    {match.status === 'in_play' ? 'LIVE' : match.status}
                  </span>
                </div>
                <button 
                  className="bet-now-button" 
                  onClick={() => handleBetNow(match)}
                >
                  Bet Now
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Matches Section */}
      <section className="main-matches-section">
        <div className="section-header">
          <h2>Cricket Matches</h2>
          <p className="last-update">Last updated: {lastUpdate.toLocaleTimeString()}</p>
        </div>

        {/* Tab Switcher */}
        <div className="tab-container">
          <button
            className={`tab ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            Live Matches
          </button>
          <button
            className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Matches
          </button>
          <button
            className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Completed Matches
          </button>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const selectedDate = e.target.value;
              console.log('Raw selected date:', selectedDate);
              
              // Ensure the date is in the expected YYYY-MM-DD format for backend
              if (selectedDate) {
                // Create a date object from the input value (which is already in YYYY-MM-DD format)
                // The input element uses the user's local timezone by default
                setDate(selectedDate);
                console.log('Set date filter to:', selectedDate);
              } else {
                setDate('');
              }
            }}
            placeholder="Select Date"
          />
          <select value={league} onChange={(e) => setLeague(e.target.value)}>
            <option value="">All Leagues</option>
            <option value="T20 Krushnamai Premier League 2025">T20 Krushnamai Premier League</option>
            <option value="T10 European Cricket League 2025">T10 European Cricket League</option>
            <option value="IPL 2025">IPL 2025</option>
          </select>
          <button 
            className="filter-reset" 
            onClick={() => {
              setLeague('');
              setDate('');
            }}
          >
            X
          </button>
        </div>

        {/* Loading state */}
        {loading && <div className="loading-indicator">Loading matches...</div>}
        
        {/* Error state */}
        {error && <div className="error-message">{error}</div>}

        {/* Match List */}
        <div className="match-list">
          {!loading && !error && displayedMatches.length > 0 ? (
            displayedMatches.map((match) => (
              <div key={match.id} className="match-card">
                <div className="match-header">
                  <span className="match-league">{match.league || 'Cricket League'}</span>
                  <span className={`match-status status-${match.status}`}>
                    {match.status === 'in_play' ? 'LIVE' : match.status}
                  </span>
                </div>
                
                <div className="match-teams">
                  <div className={`team home-team ${getTeamClass(match.home_team, match.home_team_color)}`}>
                    <span className="team-name">{match.home_team}</span>
                    <span className="team-odds">{parseFloat(match.home_odds).toFixed(2)}</span>
                  </div>
                  <span className="vs">VS</span>
                  <div className={`team away-team ${getTeamClass(match.away_team, match.away_team_color)}`}>
                    <span className="team-name">{match.away_team}</span>
                    <span className="team-odds">{parseFloat(match.away_odds).toFixed(2)}</span>
                  </div>
                </div>

                <div className="match-info">
                  <div className="match-detail">
                    <i className="icon venue-icon">📍</i>
                    <span>{match.venue || 'TBD'}</span>
                  </div>
                  <div className="match-detail">
                    <i className="icon date-icon">📅</i>
                    <span>{formatMatchDate(match.scheduled)}</span>
                  </div>
                  <div className="match-detail">
                    <i className="icon bookmaker-icon">🏢</i>
                    <span>{match.bookmaker || 'Unknown'}</span>
                  </div>
                </div>

                {/* Score and Winner Only if Completed */}
                {(match.status === 'closed' || match.status === 'finished') && (
                  <div className="match-result">
                    <div className="result-item">
                      <i className="icon winner-icon">🏆</i>
                      <span>Winner: {match.match_winner || 'Not Available'}</span>
                    </div>
                    {match.home_score && match.away_score && (
                      <div className="result-item">
                        <i className="icon score-icon">📊</i>
                        <span>Score: {match.home_score} - {match.away_score}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="match-actions">
                  <button 
                    className="details-button"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    Details
                  </button>
                  
                  {match.status !== 'closed' && match.status !== 'finished' && (
                    <button 
                      className="bet-button"
                      onClick={() => handleBetNow(match)}
                    >
                      Place Bet
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            !loading && !error && (
              <div className="no-matches">
                <p>No matches available for the selected filters</p>
                <button onClick={() => {
                  setActiveTab('live');
                  setLeague('');
                  setDate('');
                }}>View All Matches</button>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
