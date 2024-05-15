import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketIo: React.FC = () => {
  const [data, setData] = useState<string>('');

  useEffect(() => {
    const APIkey = '646a21b069efe4c7eb85d8eb05ed20bdf1ecf2228ecf1f65cf006166c64b94f';
    const socket = io(`wss://wss.apifootball.com/livescore?WidgetKey=%27+${APIkey}+%27&timezone=+03:00`); // Your WebSocket server URL

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      socket.emit('get_data'); // Send a request to the server to get data
    });

    socket.on('message', (message: string) => {
      console.log('Received message:', message);
      setData(message); // Update state with the received data
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>Data from Server:</h1>
      <p>{data}</p>
    </div>
  );
};

export default SocketIo;
