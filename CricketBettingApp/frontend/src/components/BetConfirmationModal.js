import React from 'react';
import '../styles/components/BetConfirmationModal.css';

const BetConfirmationModal = ({ matchDetails, betDetails, onConfirm, onCancel }) => {
  const { team, amount, betType, predictionValue, potentialWinnings } = betDetails;
  
  return (
    <div className="modal-overlay">
      <div className="bet-confirmation-modal">
        <div className="modal-header">
          <h2>Confirm Your Bet</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        
        <div className="match-summary">
          <span className="vs-label">VS</span>
          <div className="team-container">
            <div className={`team ${team === matchDetails.home_team ? 'selected' : ''}`}>
              {matchDetails.home_team}
            </div>
            <div className={`team ${team === matchDetails.away_team ? 'selected' : ''}`}>
              {matchDetails.away_team}
            </div>
          </div>
        </div>
        
        <div className="confirmation-details">
          <div className="confirmation-row">
            <span><i className="fas fa-futbol"></i> Bet Type</span>
            <span className="value">{betType === 'winner' ? 'Match Winner' : betType === 'runs' ? 'Total Runs' : 'Total Wickets'}</span>
          </div>
          
          {betType === 'winner' ? (
            <div className="confirmation-row">
              <span><i className="fas fa-trophy"></i> Team</span>
              <span className="value highlight">{team}</span>
            </div>
          ) : (
            <div className="confirmation-row">
              <span><i className="fas fa-bullseye"></i> Prediction</span>
              <span className="value highlight">{predictionValue} {betType}</span>
            </div>
          )}
          
          <div className="confirmation-row">
            <span><i className="fas fa-coins"></i> Amount</span>
            <span className="value">₹{parseFloat(amount).toLocaleString()}</span>
          </div>
          
          <div className="confirmation-row">
            <span><i className="fas fa-percentage"></i> Odds</span>
            <span className="value">{team === matchDetails.home_team 
              ? parseFloat(matchDetails.home_odds).toFixed(2) 
              : parseFloat(matchDetails.away_odds).toFixed(2)
            }</span>
          </div>
          
          <div className="confirmation-row highlight-row">
            <span><i className="fas fa-money-bill-wave"></i> Potential Winnings</span>
            <span className="value win-value">₹{parseFloat(potentialWinnings).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="confirmation-warning">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Once placed, bets cannot be cancelled or modified.</p>
        </div>
        
        <div className="confirmation-buttons">
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-button" onClick={onConfirm}>
            Confirm Bet
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetConfirmationModal; 