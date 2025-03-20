import React from 'react';
import '../styles/components/BetConfirmationModal.css';

const BetConfirmationModal = ({ matchDetails, betDetails, onConfirm, onCancel }) => {
  const { team, amount, betType, predictionValue, potentialWinnings } = betDetails;
  
  return (
    <div className="modal-overlay">
      <div className="bet-confirmation-modal">
        <h2>Confirm Your Bet</h2>
        
        <div className="confirmation-details">
          <div className="confirmation-row">
            <span>Match:</span>
            <span>{matchDetails.home_team} vs {matchDetails.away_team}</span>
          </div>
          
          <div className="confirmation-row">
            <span>Bet Type:</span>
            <span>{betType === 'winner' ? 'Match Winner' : betType === 'runs' ? 'Total Runs' : 'Total Wickets'}</span>
          </div>
          
          {betType === 'winner' ? (
            <div className="confirmation-row">
              <span>Team:</span>
              <span>{team}</span>
            </div>
          ) : (
            <div className="confirmation-row">
              <span>Prediction:</span>
              <span>{predictionValue} {betType}</span>
            </div>
          )}
          
          <div className="confirmation-row">
            <span>Amount:</span>
            <span>{amount}</span>
          </div>
          
          <div className="confirmation-row highlight">
            <span>Potential Winnings:</span>
            <span>{potentialWinnings}</span>
          </div>
          
          <div className="confirmation-row">
            <span>Odds:</span>
            <span>{team === matchDetails.home_team ? matchDetails.home_odds : matchDetails.away_odds}</span>
          </div>
        </div>
        
        <div className="confirmation-warning">
          <p>⚠️ Once placed, bets cannot be cancelled or modified.</p>
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