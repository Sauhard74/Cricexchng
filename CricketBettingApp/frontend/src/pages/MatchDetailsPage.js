import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMatchDetails } from '../api/apiService';
import '../styles/pages/MatchDetailsPage.css';

const MatchDetailsPage = () => {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('scorecard');
  const { matchId } = useParams();

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!matchId) {
          throw new Error('Match ID is required');
        }

        // Log the match ID we're trying to fetch
        console.log('🔍 [PAGE] Fetching details for match:', {
          raw_id: matchId,
          encoded_id: encodeURIComponent(matchId)
        });

        const data = await getMatchDetails(matchId);
        
        if (!data) {
          throw new Error('No match data received');
        }

        console.log('✅ [PAGE] Received match data:', {
          teams: `${data.home_team} vs ${data.away_team}`,
          has_batting: data.batting_scorecard?.home_team?.length > 0,
          has_bowling: data.bowling_scorecard?.home_team?.length > 0,
          status: data.status
        });

        setMatch(data);
      } catch (error) {
        console.error('❌ [PAGE] Error fetching match details:', error);
        setError(error.message || 'Failed to load match details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId]);

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not available';
    }
  };

  // Helper function to render batting table
  const renderBattingTable = (battingData, teamName) => {
    if (!battingData || battingData.length === 0) {
      return (
        <div className="no-data-message">
          No batting data available for {teamName}
        </div>
      );
    }

    return (
      <table className="batting-table">
        <thead>
          <tr>
            <th>Batsman</th>
            <th>R</th>
            <th>B</th>
            <th>4s</th>
            <th>6s</th>
            <th>SR</th>
            <th>Dismissal</th>
          </tr>
        </thead>
        <tbody>
          {battingData.map((batsman, index) => (
            <tr key={`${batsman.name}-${index}`}>
              <td>{batsman.name}</td>
              <td>{batsman.runs}</td>
              <td>{batsman.balls_faced}</td>
              <td>{batsman.fours}</td>
              <td>{batsman.sixes}</td>
              <td>{batsman.strike_rate}</td>
              <td>{batsman.dismissal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Helper function to render bowling table
  const renderBowlingTable = (bowlingData, teamName) => {
    if (!bowlingData || bowlingData.length === 0) {
      return (
        <div className="no-data-message">
          No bowling data available for {teamName}
        </div>
      );
    }

    return (
      <table className="bowling-table">
        <thead>
          <tr>
            <th>Bowler</th>
            <th>O</th>
            <th>M</th>
            <th>R</th>
            <th>W</th>
            <th>Econ</th>
            <th>Extras</th>
          </tr>
        </thead>
        <tbody>
          {bowlingData.map((bowler, index) => (
            <tr key={`${bowler.name}-${index}`}>
              <td>{bowler.name}</td>
              <td>{bowler.overs}</td>
              <td>{bowler.maidens}</td>
              <td>{bowler.runs_conceded}</td>
              <td>{bowler.wickets}</td>
              <td>{bowler.economy}</td>
              <td>{(bowler.wides || 0) + (bowler.no_balls || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (loading) {
    return (
      <div className="match-details-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-details-container">
        <div className="error-message">
          <i className="error-icon">⚠️</i>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="match-details-container">
        <div className="error-message">
          <i className="error-icon">❌</i>
          <p>Match not found</p>
          <button 
            className="back-button"
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-details-container">
      <div className="match-header">
        <h1>{match.home_team} vs {match.away_team}</h1>
        <div className="match-meta">
          <span className="match-date">{formatDate(match.scheduled)}</span>
          <span className={`match-status status-${match.status?.toLowerCase()}`}>
            {match.status}
          </span>
          <span className="match-venue">{match.venue || 'Venue TBD'}</span>
        </div>
        {match.toss_winner && (
          <div className="toss-info">
            Toss: {match.toss_winner} won and chose to {match.toss_decision}
          </div>
        )}
      </div>

      <div className="match-score">
        <div className="team-score home">
          <h3>{match.home_team}</h3>
          <span className="score">{match.home_score || 'Yet to bat'}</span>
        </div>
        <div className="team-score away">
          <h3>{match.away_team}</h3>
          <span className="score">{match.away_score || 'Yet to bat'}</span>
        </div>
      </div>

      <div className="match-content">
        <div className="tab-container">
          <button
            className={`tab ${activeTab === 'scorecard' ? 'active' : ''}`}
            onClick={() => setActiveTab('scorecard')}
          >
            Scorecard
          </button>
          <button
            className={`tab ${activeTab === 'commentary' ? 'active' : ''}`}
            onClick={() => setActiveTab('commentary')}
          >
            Commentary
          </button>
        </div>

        {activeTab === 'scorecard' ? (
          <div className="scorecard">
            <div className="team-innings">
              <h2>{match.home_team} Innings</h2>
              {renderBattingTable(match.batting_scorecard?.home_team, match.home_team)}
              <h3>Bowling</h3>
              {renderBowlingTable(match.bowling_scorecard?.away_team, match.away_team)}
            </div>
            <div className="team-innings">
              <h2>{match.away_team} Innings</h2>
              {renderBattingTable(match.batting_scorecard?.away_team, match.away_team)}
              <h3>Bowling</h3>
              {renderBowlingTable(match.bowling_scorecard?.home_team, match.home_team)}
            </div>
          </div>
        ) : (
          <div className="commentary">
            {match.commentary && match.commentary.length > 0 ? (
              <div className="commentary-list">
                {match.commentary.map((item, index) => (
                  <div key={index} className="commentary-item">
                    <div className="over-ball">
                      {item.over}.{item.ball}
                    </div>
                    <div className="commentary-text">
                      <strong>{item.bowler}</strong> to <strong>{item.batsman}</strong>
                      <br />
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data-message">
                No commentary available for this match
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchDetailsPage;
