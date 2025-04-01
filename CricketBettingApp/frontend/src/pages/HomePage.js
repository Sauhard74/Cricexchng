import { useEffect, useState } from 'react';
import { getLiveMatches, getCompletedMatches } from '../api/apiService';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/HomePage.css';
import { wsService } from '../services/websocketService';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const [matches, setMatches] = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
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
      
      // Convert to IST by adding 5 hours and 30 minutes
      const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
      
      return istDate.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }) + ' IST';
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
      
      // Fetch both live/upcoming and completed matches
      const [liveData, completedData] = await Promise.all([
        getLiveMatches(),
        getCompletedMatches()
      ]);
      
      console.log('Fetched live matches:', liveData.length);
      console.log('Fetched completed matches:', completedData.length);
      
      // Process the live matches
      const processedLiveMatches = (liveData || []).map(match => {
        const status = (match.status || '').toLowerCase();

        // If status is explicitly live/in_play/started from sheet, keep it as is
        if (['in_play', 'live', 'started'].includes(status)) {
          return {
            ...match,
            status: 'live'
          };
        }
        
        // For future/scheduled matches
        if (['scheduled', 'not_started', 'pending', 'created'].includes(status)) {
          return {
            ...match,
            status: 'scheduled'
          };
        }
        
        return match;
      });

      // Process completed matches
      const processedCompletedMatches = (completedData || []).map(match => ({
        ...match,
        status: 'completed'
      }));

      console.log('Processed live matches:', processedLiveMatches.length);
      console.log('Processed completed matches:', processedCompletedMatches.length);

      setMatches(prevMatches => {
        const hasChanges = JSON.stringify(prevMatches) !== JSON.stringify(processedLiveMatches);
        return hasChanges ? processedLiveMatches : prevMatches;
      });

      setCompletedMatches(prevMatches => {
        const hasChanges = JSON.stringify(prevMatches) !== JSON.stringify(processedCompletedMatches);
        return hasChanges ? processedCompletedMatches : prevMatches;
      });
      
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setError('Failed to load matches');
      setLoading(false);
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
        const updatedMatches = prevMatches.map(match => {
          const updatedOdd = updatedOdds.find(odd => odd.matchId === match.id);
          if (updatedOdd) {
            // Preserve existing match data, only update odds
            return {
              ...match,
              home_odds: updatedOdd.homeOdds,
              away_odds: updatedOdd.awayOdds,
              bookmaker: updatedOdd.bookmaker,
              lastUpdated: new Date(),
              // Preserve the original status if it's a future match
              status: match.scheduled > new Date() ? 'scheduled' : match.status
            };
          }
          return match;
        });

        // Only update if there are actual changes
        const hasChanges = JSON.stringify(prevMatches) !== JSON.stringify(updatedMatches);
        return hasChanges ? updatedMatches : prevMatches;
      });
      setLastUpdate(new Date());
    });

    // Set up periodic refresh with a longer interval
    const refreshInterval = setInterval(() => {
      // Only fetch if it's been more than 5 minutes since the last update
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      if (lastUpdate < fiveMinutesAgo) {
        fetchMatches();
      }
    }, 60000);

    // Cleanup function
    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []); // Empty dependency array

  // Add lastUpdate to the dependency array of useEffect
  useEffect(() => {
    // This effect will run when lastUpdate changes
    console.log('Last update:', lastUpdate);
  }, [lastUpdate]);

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
  const filteredMatches = activeTab === 'recent' ? completedMatches.filter(match => {
    // Remove matches with missing essential data
    if (!match.home_team || !match.away_team || !match.scheduled) {
      return false;
    }

    // Apply league and date filters if selected
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
  }) : matches.filter(match => {
    // Remove matches with missing essential data
    if (!match.home_team || !match.away_team || !match.scheduled) {
      return false;
    }

    const status = (match.status || '').toLowerCase();
    
    if (activeTab === 'live') {
      // Show any match with status 'live' or 'in_play' or 'started'
      return ['live', 'in_play', 'started'].includes(status);
    } else if (activeTab === 'upcoming') {
      // Show any match with status 'scheduled', 'pending', 'not_started' or empty status
      return ['scheduled', 'pending', 'not_started', 'created', ''].includes(status);
    }
    return true;
  });

  // Get featured matches (first 3 upcoming or live matches)
  const featuredMatches = matches
    .filter(match => {
      const status = (match.status || '').toLowerCase();
      
      // Check if match has required data
      if (!match.home_team || !match.away_team || !match.scheduled) {
        console.log('Filtering out match due to missing data:', match.id);
        return false;
      }

      // Don't show completed matches in featured section
      if (status === 'completed') {
        console.log('Filtering out completed match:', match.id);
        return false;
      }

      // Include both live and upcoming matches with valid odds
      return (
        // Match is either live or upcoming based on status
        (['live', 'in_play', 'started'].includes(status) || 
         ['scheduled', 'pending', 'not_started', 'created', ''].includes(status)) &&
        // Ensure odds are available
        match.home_odds &&
        match.away_odds
      );
    })
    .sort((a, b) => {
      const statusA = (a.status || '').toLowerCase();
      const statusB = (b.status || '').toLowerCase();
      const isLiveA = ['live', 'in_play', 'started'].includes(statusA);
      const isLiveB = ['live', 'in_play', 'started'].includes(statusB);
      
      // Show live matches first
      if (isLiveA && !isLiveB) return -1;
      if (!isLiveA && isLiveB) return 1;
      
      // Then sort by scheduled time
      return new Date(a.scheduled) - new Date(b.scheduled);
    })
    .slice(0, 3);

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
            data-count={matches.filter(m => ['live', 'in_play', 'started'].includes(m.status?.toLowerCase())).length}
          >
            <span>Live Matches</span>
          </button>
          <button
            className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
            data-count={matches.filter(m => ['scheduled', 'pending', 'not_started', 'created', ''].includes(m.status?.toLowerCase())).length}
          >
            <span>Upcoming Matches</span>
          </button>
          <button
            className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
            data-count={completedMatches.length}
          >
            <span>Completed Matches</span>
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
                  {/* Temporarily hiding match details page
                  <button 
                    className="details-button"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    Details
                  </button>
                  */}
                  
                  {/* Only show bet button for non-completed matches */}
                  {(match.status || '').toLowerCase() !== 'closed' && 
                   (match.status || '').toLowerCase() !== 'finished' && 
                   (match.status || '').toLowerCase() !== 'completed' && 
                   (match.status || '').toLowerCase() !== 'ended' && (
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
