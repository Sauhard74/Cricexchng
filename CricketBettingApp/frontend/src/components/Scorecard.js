import '../styles/pages/Scorecard.css'

const Scorecard = ({ data }) => {
  if (!data) return <p>No scorecard data available.</p>;

  const emptyRow = {
    name: '-',
    runs: '-',
    balls: '-',
    fours: '-',
    sixes: '-',
    strike_rate: '-',
    dismissal: '-',
  };

  const emptyBowlingRow = {
    name: '-',
    overs: '-',
    maidens: '-',
    runs_conceded: '-',
    wickets: '-',
    economy: '-',
  };

  // Render Batting Table
  const renderTable = (team, teamName, role) => (
    <div className="scorecard-section">
      <h3>{`${teamName} ${role}`}</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Runs</th>
            <th>Balls Faced</th>
            <th>Fours</th>
            <th>Sixes</th>
            <th>Strike Rate</th>
            <th>Dismissal</th>
          </tr>
        </thead>
        <tbody>
          {(team?.length ? team : [emptyRow]).map((player, index) => (
            <tr key={index}>
              <td>{player.name || '-'}</td>
              <td>{player.runs || '-'}</td>
              <td>{player.balls_faced || '-'}</td>
              <td>{player.fours || '-'}</td>
              <td>{player.sixes || '-'}</td>
              <td>{player.strike_rate || '-'}</td>
              <td>{player.dismissal || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ✅ Fix Bowling Table
  const renderBowlingTable = (team, teamName) => (
    <div className="scorecard-section">
      <h3>{`${teamName} Bowling`}</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Overs</th>
            <th>Maidens</th>
            <th>Runs Conceded</th>
            <th>Wickets</th>
            <th>Economy</th>
          </tr>
        </thead>
        <tbody>
          {(team?.length ? team : [emptyBowlingRow]).map((player, index) => (
            <tr key={index}>
              <td>{player.name || '-'}</td>
              <td>{player.overs || '-'}</td>
              <td>{player.maidens || '-'}</td>
              <td>{player.runs_conceded || '-'}</td>
              <td>{player.wickets || '-'}</td>
              <td>{player.economy || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="scorecard">
      {/* ✅ Match Info */}
      <div className="match-info">
        <h2>{`${data?.home_team_name} vs ${data?.away_team_name}`}</h2>
        <p>📅 Date: {data?.date || '-'}</p>
        <p>📍 Venue: {data?.venue || '-'}</p>
        <p>🔥 Status: {data?.status || '-'}</p>
        <p>🏆 Toss: {data?.toss || '-'}</p>
        <p>🥇 Winner: {data?.winner || '-'}</p>
        <p>🏏 Score: {data?.home_team_score || '-'} - {data?.away_team_score || '-'}</p>
      </div>

      {/* ✅ Home Team Batting */}
      {data.home_team && renderTable(data.home_team, data.home_team_name, "Batting")}
      {/* ✅ Home Team Bowling */}
      {data.home_bowling && renderBowlingTable(data.home_bowling, data.home_team_name)}

      {/* ✅ Away Team Batting */}
      {data.away_team && renderTable(data.away_team, data.away_team_name, "Batting")}
      {/* ✅ Away Team Bowling */}
      {data.away_bowling && renderBowlingTable(data.away_bowling, data.away_team_name)}
    </div>
  );
};

export default Scorecard;
