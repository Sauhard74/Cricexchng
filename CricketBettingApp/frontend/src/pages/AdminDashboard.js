import { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/pages/AdminDashboard.css';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [creditRequests, setCreditRequests] = useState([]);
  const [bets, setBets] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchCreditRequests();
      fetchBets();
    }
  }, [isAdmin]);

  // ✅ Fetch all users
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // ✅ Fetch all credit requests
  const fetchCreditRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/credit-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreditRequests(data);
    } catch (error) {
      console.error('Failed to load credit requests:', error);
    }
  };

  // ✅ Fetch all bets
  const fetchBets = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/bets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBets(data);
    } catch (error) {
      console.error('Failed to load bets:', error);
    }
  };

  // ✅ Handle Approve/Reject Credit Request
  const handleCreditAction = async (id, status, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/credit-requests/${id}`,
        { status, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Update State Directly After Action
      setCreditRequests((prev) =>
        prev.map((req) =>
          req._id === data.request._id ? { ...req, ...data.request } : req
        )
      );
    } catch (error) {
      console.error(`Failed to ${status} credit request:`, error);
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

  // ✅ Delete Bet
  const handleDeleteBet = async (id) => {
    if (window.confirm('Are you sure you want to delete this bet?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/admin/bets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // ✅ Update State Directly After Action
        setBets((prev) => prev.filter((bet) => bet._id !== id));
      } catch (error) {
        console.error('Failed to delete bet:', error);
      }
    }
  };

  if (!isAdmin) {
    return <div>❌ Access Denied</div>;
  }

  return (
    <div className="admin-dashboard">
      <h2>🏆 Admin Dashboard</h2>

      {/* ✅ User List */}
      <section>
        <h3>👥 Users</h3>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ✅ Credit Requests */}
      <section>
        <h3>💰 Credit Requests</h3>
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
                      <button onClick={() => handleCreditAction(request._id, 'approve')}>✅ Approve</button>
                      <button onClick={() => handleCreditAction(request._id, 'reject')}>❌ Reject</button>
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
        <h3>📊 Bets</h3>
        <table>
          <thead>
            <tr>
              <th>Match</th>
              <th>Username</th>
              <th>Amount</th>
              <th>Team</th>
              <th>Bet Type</th>
              <th>Odds</th>
              <th>Status</th>
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
                <td>
                  <span className={`bet-type ${bet.betType}`}>
                    {bet.betType === 'back' ? '📈 Back' : 
                     bet.betType === 'lay' ? '📉 Lay' : 
                     bet.betType === 'winner' ? '🏆 Winner' : 
                     bet.betType}
                  </span>
                </td>
                <td>{bet.odds || '-'}</td>
                <td>
                  <span className={`bet-status ${bet.status.toLowerCase()}`}>
                    {bet.status}
                  </span>
                </td>
                <td>{bet.predictionValue || 'N/A'}</td>
                <td>
                  <button className="cancel-bet-btn" onClick={() => handleDeleteBet(bet._id)}>❌ Cancel Bet</button>
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
