import { useEffect, useState } from 'react';
import { getLiveMatches } from '../api/apiService';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/HomePage.css';
import { wsService } from '../services/websocketService';

const HomePage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('live');
  const [league, setLeague] = useState('');
  const [date, setDate] = useState('');
  const navigate = useNavigate();
  const [lastUpdate, setLastUpdate] = useState(new Date());

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

  return (
    <div className="home-container">
      <h2>🏏 Cricket Matches with Betting Odds</h2>
      <p className="last-update">Last updated: {lastUpdate.toLocaleTimeString()}</p>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="Select Date"
        />
        <select value={league} onChange={(e) => setLeague(e.target.value)}>
          <option value="">Select League</option>
          <option value="T20 Krushnamai Premier League 2025">T20 Krushnamai Premier League 2025</option>
          <option value="T10 European Cricket League 2025">T10 European Cricket League 2025</option>
        </select>
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
          className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent Matches
        </button>
        <button
          className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Matches
        </button>
      </div>

      {/* Loading state */}
      {loading && <div className="loading-indicator">Loading matches...</div>}
      
      {/* Error state */}
      {error && <div className="error-message">{error}</div>}

      {/* Match List */}
      <div className="match-list">
        {!loading && !error && matches.length > 0 ? (
          matches.map((match) => (
            <div key={match.id} className="match-card">
              <h3>{match.league || 'Cricket League'} - {match.home_team} vs {match.away_team}</h3>
              <p>📍 Venue: {match.venue || 'TBD'}</p>
              <p>📅 Date: {formatMatchDate(match.scheduled)}</p>
              <p>🔥 Status: {match.status}</p>
              
              {/* Display Odds */}
              <div className="odds-display">
                <p>📊 Odds: {match.home_team}: 
                  <strong>{parseFloat(match.home_odds).toFixed(2)}</strong> | 
                  {match.away_team}: 
                  <strong>{parseFloat(match.away_odds).toFixed(2)}</strong>
                </p>
                <p>🏢 Bookmaker: {match.bookmaker || 'Unknown'}</p>
              </div>

              {/* Score and Winner Only if Completed */}
              {match.status === 'closed' && (
                <>
                  <p>🏆 Winner: {match.match_winner}</p>
                  <p>📊 Score: {match.home_score} - {match.away_score}</p>
                </>
              )}

              {/* ✅ Buttons */}
              <div className="button-group">
                <button onClick={() => navigate(`/match/${match.id}`)}>
                  Match Details
                </button>
                {/* Show Bet Now button for any match that isn't finished/closed */}
                {match.status !== 'closed' && match.status !== 'finished' && (
                  <button onClick={() => {
                    // Log the match ID for debugging
                    console.log('Match ID before encoding:', match.id);
                    
                    // Replace slashes with a different character to avoid URL path issues
                    const safeMatchId = String(match.id).replace(/\//g, '___');
                    
                    // Encode the safe match ID
                    const encodedMatchId = encodeURIComponent(safeMatchId);
                    const encodedBookmaker = encodeURIComponent(match.bookmaker || 'DraftKings');
                    
                    const targetUrl = `/betting/${encodedMatchId}?bookmaker=${encodedBookmaker}`;
                    console.log('Navigating to:', targetUrl);
                    
                    navigate(targetUrl);
                  }}>
                    Bet Now
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          !loading && !error && <p>No matches with available odds</p>
        )}
      </div>
    </div>
  );
};

export default HomePage;
