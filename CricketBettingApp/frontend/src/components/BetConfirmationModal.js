import React from 'react';
import '../styles/components/BetConfirmationModal.css';

const BetConfirmationModal = ({ matchDetails, betDetails, onConfirm, onCancel }) => {
  const { team, amount, betType, predictionValue, potentialWinnings, odds, liability } = betDetails;
  
  // Helper function to get a readable bet type description
  const getBetTypeDescription = () => {
    switch (betType) {
      case 'winner': return 'Match Winner';
      case 'runs': return 'Total Runs';
      case 'wickets': return 'Total Wickets';
      case 'back': return 'Back Bet';
      case 'lay': return 'Lay Bet';
      default: return betType;
    }
  };
  
  // Calculate liability if it's a lay bet
  const calculatedLiability = betType === 'lay' && odds ? 
    parseFloat(amount) * (parseFloat(odds) - 1) : 0;
  
  return (
    <div className="modal-overlay">
      <div className="bet-confirmation-modal">
        <h2>Confirm Your Bet</h2>
        
        <div className={`bet-type-header ${betType === 'back' ? 'back-header' : 'lay-header'}`}>
          {betType === 'back' ? 'Back Bet' : 'Lay Bet'}
        </div>
        
        <div className="confirmation-details">
          <div className="confirmation-row">
            <span>Match:</span>
            <span>{matchDetails.home_team} vs {matchDetails.away_team}</span>
          </div>
          
          <div className="confirmation-row">
            <span>Team:</span>
            <span>{team}</span>
          </div>
          
          <div className="confirmation-row">
            <span>Stake Amount:</span>
            <span>{amount} credits</span>
          </div>
          
          <div className="confirmation-row">
            <span>Odds:</span>
            <span>{odds}</span>
          </div>
          
          {betType === 'lay' && (
            <div className="confirmation-row highlight warning">
              <span>Your Liability:</span>
              <span>{calculatedLiability.toFixed(2)} credits</span>
            </div>
          )}
          
          <div className="confirmation-row highlight">
            <span>{betType === 'lay' ? 'Potential Profit:' : 'Potential Winnings:'}</span>
            <span>{potentialWinnings} credits</span>
          </div>
          
          {betType === 'lay' && (
            <div className="lay-explanation">
              <p>
                <strong>Lay Bet Summary:</strong> You're betting AGAINST {team} winning.
                You'll win {amount} credits if {team} loses, but risk {calculatedLiability.toFixed(2)} credits if they win.
              </p>
            </div>
          )}
          
          {betType === 'back' && (
            <div className="back-explanation">
              <p>
                <strong>Back Bet Summary:</strong> You're betting FOR {team} to win.
                You'll win {potentialWinnings} credits if {team} wins, but lose your stake if they lose.
              </p>
            </div>
          )}
        </div>
        
        <div className="confirmation-warning">
          <p>⚠️ Once placed, bets cannot be cancelled or modified.</p>
        </div>
        
        <div className="confirmation-buttons">
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className={`confirm-button ${betType === 'back' ? 'back-button' : 'lay-button'}`} onClick={onConfirm}>
            Confirm {betType === 'back' ? 'Back' : 'Lay'} Bet
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetConfirmationModal; 