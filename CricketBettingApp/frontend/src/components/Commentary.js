const Commentary = ({ commentary }) => {
  if (!commentary || commentary.length === 0) return <p>No commentary available.</p>;

  return (
    <div className="commentary-section">
      {commentary.map((comment, index) => (
        <div key={index} className="comment">
          <strong>Over:</strong> {comment.over}, Ball: {comment.ball} <br />
          <strong>Batsman:</strong> {comment.batsman} | <strong>Bowler:</strong> {comment.bowler} <br />
          <strong>Runs:</strong> {comment.runs} <br />
          <p>{comment.description}</p>
        </div>
      ))}
    </div>
  );
};

export default Commentary;
