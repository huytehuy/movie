import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WatchPartyPlayer, createWatchPartyRoom, useWatchParty } from './REACT_INTEGRATION';

export default function WatchPartyTest() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [roomId, setRoomId] = useState(searchParams.get('room') || '');
    const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000));
    const [movieId] = useState('1');
    const [videoUrl, setVideoUrl] = useState('https://vip.opstream10.com/20260202/32664_4e688af0/index.m3u8');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Update URL when roomId changes
    useEffect(() => {
        if (roomId) {
            setSearchParams({ room: roomId, video: videoUrl }); // Optional: store video in URL too
        } else {
            searchParams.delete('room'); // Clean up URL if room is left
            // Keep video param if user wants to rejoin with same video?
            setSearchParams(searchParams);
        }
    }, [roomId, setSearchParams, videoUrl]);

    // Lifted state: Single connection for Player
    const watchPartyState = useWatchParty(roomId, username, !roomId);

    // Fetch room info if joining via URL
    useEffect(() => {
        if (roomId && !watchPartyState.connected) {
            import('./REACT_INTEGRATION').then(mod => {
                mod.getRoomInfo(roomId).then(info => {
                    if (info.customVideoUrl) {
                        setVideoUrl(info.customVideoUrl);
                    }
                }).catch(e => console.error("Could not fetch room info:", e));
            });
        }
    }, [roomId]);

    const handleCreateRoom = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await createWatchPartyRoom(movieId, 'Test Party Room', username, videoUrl); // Pass videoUrl
            console.log('Room created:', result);
            setRoomId(result.room.id);
        } catch (err: any) {
            setError('Failed to create room: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        const inputRoomId = prompt('Enter Room ID:');
        if (inputRoomId) {
            setRoomId(inputRoomId);
            // Fetch room info to get video URL
            try {
                const mod = await import('./REACT_INTEGRATION');
                const info = await mod.getRoomInfo(inputRoomId);
                if (info.customVideoUrl) {
                    setVideoUrl(info.customVideoUrl);
                }
            } catch (e) {
                console.error("Error fetching room info:", e);
            }
        }
    };

    const handleLeaveRoom = () => {
        setRoomId('');
        // URL cleanup is handled by useEffect
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1>🎉 Watch Party Test - No Video Call</h1>

            {!roomId ? (
                <div style={{ marginTop: '20px' }}>
                    <h2>Join or Create a Room</h2>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px' }}>
                            Username:
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
                            />
                        </label>
                        <label style={{ display: 'block', marginBottom: '10px' }}>
                            Video URL (m3u8):
                            <input
                                type="text"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                style={{ marginLeft: '10px', padding: '5px', width: '400px' }}
                                placeholder="Enter .m3u8 link"
                            />
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleCreateRoom}
                            disabled={loading}
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create New Room'}
                        </button>

                        <button
                            onClick={handleJoinRoom}
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            Join Existing Room
                        </button>
                    </div>

                    {error && (
                        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '5px' }}>
                            {error}
                        </div>
                    )}


                </div>
            ) : (
                <div style={{ marginTop: '20px' }}>
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>Room ID: <code>{roomId}</code></h3>
                            <button
                                onClick={handleLeaveRoom}
                                style={{
                                    padding: '5px 15px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                }}
                            >
                                Leave Room
                            </button>
                        </div>
                        <p style={{ margin: '5px 0' }}>Share this ID (or the URL) with others to invite them!</p>

                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #bbdefb' }}>
                            <div>
                                <strong>Status:</strong> {watchPartyState.connected ? '🟢 Connected' : '🔴 Disconnected'}
                            </div>
                            <div>
                                <strong>Viewers:</strong> {watchPartyState.users.length} 👤
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'relative', width: '100%', maxWidth: '1000px', margin: '0 auto', backgroundColor: 'black' }}>
                        {/* Movie Player (Base Layer) */}
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <WatchPartyPlayer
                                roomId={roomId}
                                username={username}
                                videoUrl={videoUrl}
                                existingState={watchPartyState}
                            />
                        </div>
                    </div>


                </div>
            )}
        </div>
    );
}
