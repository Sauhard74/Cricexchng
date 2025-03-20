// WebSocket service for real-time odds updates
let socket = null;
let subscribers = [];
let reconnectTimer = null;
const MAX_RECONNECT_DELAY = 5000;

const wsService = {
  connect: () => {
    // Only create a new connection if one doesn't exist
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }
    
    try {
      // Get the WebSocket URL from environment or use a default
      const wsUrl = process.env.REACT_APP_WS_URL || 
                    `ws://${window.location.hostname}:${process.env.REACT_APP_API_PORT || '5001'}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        // Clear any reconnect timers
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Only process ODDS_UPDATE messages
          if (data.type === 'ODDS_UPDATE') {
            console.log('Processing odds update with data:', data.data);
            // Notify all subscribers
            subscribers.forEach(callback => {
              try {
                callback(data.data);
              } catch (err) {
                console.error('Error in subscriber callback:', err);
              }
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      socket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after a delay
        reconnectTimer = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          wsService.connect();
        }, Math.random() * MAX_RECONNECT_DELAY);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  },
  
  disconnect: () => {
    if (socket) {
      socket.close();
      socket = null;
    }
    // Clear any reconnect timers
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  },
  
  subscribe: (callback) => {
    if (typeof callback !== 'function') {
      console.error('WebSocket subscribe requires a function callback');
      return () => {};
    }
    
    subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      subscribers = subscribers.filter(cb => cb !== callback);
    };
  },
  
  // Helper method to check connection status
  isConnected: () => {
    return socket && socket.readyState === WebSocket.OPEN;
  }
};

export { wsService };