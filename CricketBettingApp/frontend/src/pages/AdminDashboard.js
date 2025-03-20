import { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/pages/AdminDashboard.css';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [creditRequests, setCreditRequests] = useState([]);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchCreditRequests();
      fetchBets();
    }
  }, [isAdmin]);

  // Show a temporary message
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ✅ Fetch all users
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (data && Array.isArray(data)) {
        setUsers(data);
        console.log("Users fetched successfully:", data.length);
      } else {
        console.error("Invalid user data format received:", data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      showMessage('Failed to refresh user data', 'error');
    }
  };

  // ✅ Fetch all credit requests
  const fetchCreditRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/credit-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (data && Array.isArray(data)) {
        setCreditRequests(data);
        console.log("Credit requests fetched successfully:", data.length);
      } else {
        console.error("Invalid credit requests data format received:", data);
      }
    } catch (error) {
      console.error('Failed to load credit requests:', error);
      showMessage('Failed to refresh credit requests', 'error');
    }
  };

  // ✅ Fetch all bets
  const fetchBets = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/bets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (data && Array.isArray(data)) {
        setBets(data);
        console.log("Bets fetched successfully:", data.length);
      } else {
        console.error("Invalid bets data format received:", data);
      }
    } catch (error) {
      console.error('Failed to load bets:', error);
      showMessage('Failed to refresh bets data', 'error');
    }
  };

  // ✅ Handle Approve/Reject Credit Request
  const handleCreditAction = async (id, status, reason = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Map frontend status values to backend status values
      const backendStatus = status === 'approve' ? 'approved' : 'rejected';
      
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/credit-requests/${id}`,
        { status: backendStatus, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove the request from the state after approval/rejection
      setCreditRequests((prev) => prev.filter((req) => req._id !== id));

      // Refresh users list after a short delay to show updated credits
      if (status === 'approve') {
        // Wait a moment to ensure the backend has finished processing
        setTimeout(() => {
          fetchUsers();
        }, 500);
      }
      
      // Show success message
      showMessage(`Credit request ${status === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
    } catch (error) {
      console.error(`Failed to ${status} credit request:`, error);
      showMessage(`Failed to ${status} credit request. Please try again.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete User
  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // ✅ Update State Directly After Action
        setUsers((prev) => prev.filter((user) => user._id !== id));
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  // ✅ Delete Bet and Refund Credits
  const handleDeleteBet = async (id) => {
    if (window.confirm('Are you sure you want to cancel this bet? If bet is pending, the user will be refunded their credits.')) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        console.log(`Sending request to cancel bet ${id}...`);
        
        const { data } = await axios.delete(`${process.env.REACT_APP_API_URL}/api/admin/bets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log(`Server response for bet cancellation:`, data);

        // Remove bet from UI
        setBets((prev) => prev.filter((bet) => bet._id !== id));
        
        // Show appropriate message based on response
        if (data.refunded) {
          // Success case - refund processed
          showMessage('Bet cancelled and credits refunded to user', 'success');
          
          // Refresh user list to show updated credits
          console.log('Refreshing user list after credit refund...');
          setTimeout(() => {
            fetchUsers();
          }, 500);
        } else if (data.error) {
          // Error case - bet cancelled but refund failed
          showMessage(`Bet cancelled but refund failed: ${data.error}`, 'error');
          // Still refresh users in case some updates happened
          setTimeout(() => fetchUsers(), 500);
        } else {
          // No refund needed case
          showMessage('Bet cancelled. No refund was processed.', 'info');
        }
      } catch (error) {
        console.error('Failed to cancel bet:', error);
        showMessage(`Failed to cancel bet: ${error.response?.data?.error || error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // ✅ Debug function to add credits directly
  const handleAddCredits = async (username) => {
    const amount = prompt(`Enter amount of credits to add to ${username}:`);
    if (!amount) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/debug/add-credits`,
        { username, amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Debug credit addition response:', data);
      showMessage(`Added ${amount} credits to ${username}. Previous: ${data.previousCredits}, New: ${data.newCredits}`, 'success');
      
      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Failed to add credits:', error);
      showMessage(`Failed to add credits: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Verify user credits from raw database
  const handleVerifyCredits = async (username) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/verify-credits/${username}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Credit verification result:', data);
      
      const message = `
        Credits for ${username}:
        Raw: ${data.rawCredits} (${data.rawCreditsType})
        Model: ${data.modelCredits} (${data.modelCreditsType})
        Match: ${data.match ? 'Yes' : 'No'}
      `;
      
      showMessage(message, data.match ? 'success' : 'error');
    } catch (error) {
      console.error('Failed to verify credits:', error);
      showMessage(`Failed to verify credits: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Force Delete Bet and Refund Credits (admin emergency tool)
  const handleForceDeleteBet = async (id) => {
    if (window.confirm('⚠️ EMERGENCY ACTION: Force cancel bet and refund credits regardless of status?')) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        console.log(`Sending request to force cancel bet ${id}...`);
        
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/admin/bets/force-cancel/${id}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`Server response for force bet cancellation:`, data);

        // Remove bet from UI
        setBets((prev) => prev.filter((bet) => bet._id !== id));
        
        // Show success message
        showMessage(`Bet force-cancelled and ${data.refundAmount} credits refunded to user. New balance: ${data.newCredits}`, 'success');
        
        // Refresh user list to show updated credits
        setTimeout(() => fetchUsers(), 500);
      } catch (error) {
        console.error('Failed to force-cancel bet:', error);
        showMessage(`Failed to force-cancel bet: ${error.response?.data?.error || error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isAdmin) {
    return <div>❌ Access Denied</div>;
  }

  return (
    <div className="admin-dashboard">
      <h2>🏆 Admin Dashboard</h2>
      
      {/* Display feedback messages */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* ✅ User List */}
      <section>
        <h3>
          👥 Users 
          <button 
            className="refresh-btn" 
            onClick={() => {
              showMessage("Refreshing user data...", "info"); 
              fetchUsers();
            }}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </h3>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Phone</th>
              <th>Credits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.phone}</td>
                <td>{user.credits}</td>
                <td>
                  <button onClick={() => handleDeleteUser(user._id)}>❌ Remove</button>
                  <button 
                    className="debug-btn" 
                    onClick={() => handleAddCredits(user.username)}
                    disabled={loading}
                  >
                    💰 Debug Add Credits
                  </button>
                  <button 
                    className="verify-btn" 
                    onClick={() => handleVerifyCredits(user.username)}
                    disabled={loading}
                  >
                    🔍 Verify Credits
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ✅ Credit Requests */}
      <section>
        <h3>
          💰 Credit Requests
          <button 
            className="refresh-btn" 
            onClick={() => {
              showMessage("Refreshing credit requests...", "info"); 
              fetchCreditRequests();
            }}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </h3>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Amount</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {creditRequests.map(request => (
              <tr key={request._id}>
                <td>{request.username}</td>
                <td>{request.amount}</td>
                <td>{request.phone}</td>
                <td>{request.status}</td>

                <td>
                  {request.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleCreditAction(request._id, 'approve')}
                        disabled={loading}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        onClick={() => handleCreditAction(request._id, 'reject')}
                        disabled={loading}
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ✅ Bets */}
      <section>
        <h3>
          📊 Bets
          <button 
            className="refresh-btn" 
            onClick={() => {
              showMessage("Refreshing bets data...", "info"); 
              fetchBets();
            }}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </h3>
        <table>
          <thead>
            <tr>
              <th>Match</th>
              <th>Username</th>
              <th>Amount</th>
              <th>Team</th>
              <th>Status</th>
              <th>Bet Type</th>
              <th>Prediction</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bets.map(bet => (
              <tr key={bet._id}>
                <td>{bet.matchId}</td>
                <td>{bet.username}</td>
                <td>{bet.amount}</td>
                <td>{bet.team}</td>
                <td className={`bet-status bet-status-${bet.status.toLowerCase()}`}>
                  {bet.status}
                </td>
                <td>{bet.betType}</td>
                <td>{bet.predictionValue || 'N/A'}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteBet(bet._id)}
                    disabled={loading}
                  >
                    {bet.status.toLowerCase() === "pending" ? "❌ Cancel & Refund" : "❌ Cancel Bet"}
                  </button>
                  <button 
                    className="force-btn"
                    onClick={() => handleForceDeleteBet(bet._id)}
                    disabled={loading}
                  >
                    ⚠️ Force Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AdminDashboard;
