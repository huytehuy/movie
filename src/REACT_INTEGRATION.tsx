// Example React integration for Watch Party feature

// 1. Install dependencies (if needed)
// npm install @types/react

// 2. Create a WebSocket hook for Watch Party
import React, { useEffect, useRef, useState } from 'react';

export interface VideoState {
    isPlaying: boolean;
    currentTime: number;
    lastUpdateBy: string;
    updatedAt: string;
}

export interface User {
    id: string;
    username: string;
}

interface WatchPartyMessage {
    type: string;
    roomId?: string;
    userId?: string;
    username?: string;
    data?: any;
    timestamp: string;
}

export interface WatchPartyState {
    connected: boolean;
    users: User[];
    videoState: VideoState | null;
    play: (currentTime: number) => void;
    pause: (currentTime: number) => void;
    seek: (time: number) => void;
    syncTime: (currentTime: number) => void;
    sendChat: (message: string) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    myUserId: string;
}

// Helper to get API URL
const getApiUrl = () => {
    // In production, this should be the deployed backend URL
    // Examples: 'https://my-movie-app.onrender.com'
    return import.meta.env.VITE_API_URL || 'https://backend-movie-2tud.onrender.com/';
};

const getWsUrl = (roomId: string, username: string) => {
    const apiUrl = getApiUrl();
    const protocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const host = apiUrl.replace(/^https?:\/\//, '');
    return `${protocol}://${host}/api/rooms/${roomId}/ws?username=${encodeURIComponent(username)}`;
};

export const useWatchParty = (roomId: string, username: string, skipConnection = false): WatchPartyState => {
    const [connected, setConnected] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [videoState, setVideoState] = useState<VideoState | null>(null);
    const [myUserId, setMyUserId] = useState('');
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (skipConnection) return;

        // Connect to WebSocket
        const wsUrl = getWsUrl(roomId, username);
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('Connected to watch party');
            setConnected(true);
        };

        ws.current.onmessage = (event) => {
            const message: WatchPartyMessage = JSON.parse(event.data);

            switch (message.type) {
                case 'sync':
                    setVideoState(message.data);
                    break;
                case 'userList':
                    setUsers(message.data);
                    // Find our user ID from the user list
                    const me = message.data.find((u: User) => u.username === username);
                    if (me && !myUserId) {
                        setMyUserId(me.id);
                    }
                    break;
                case 'play':
                case 'pause':
                case 'seek':
                    // Handle video control events from other users
                    console.log(`${message.username} ${message.type}`, message.data);
                    // Update video state so the effect will trigger
                    if (message.type === 'play') {
                        const data = message.data as { currentTime: number };
                        setVideoState({
                            isPlaying: true,
                            currentTime: data.currentTime,
                            lastUpdateBy: message.username || '',
                            updatedAt: message.timestamp
                        });
                    } else if (message.type === 'pause') {
                        const data = message.data as { currentTime: number };
                        setVideoState({
                            isPlaying: false,
                            currentTime: data.currentTime,
                            lastUpdateBy: message.username || '',
                            updatedAt: message.timestamp
                        });
                    } else if (message.type === 'seek') {
                        const data = message.data as { time: number };
                        setVideoState(prev => prev ? {
                            ...prev,
                            currentTime: data.time,
                            lastUpdateBy: message.username || '',
                            updatedAt: message.timestamp
                        } : null);
                    }
                    break;
                case 'chat':
                    console.log(`${message.username}: ${message.data.message}`);
                    break;
            }
        };

        ws.current.onclose = () => {
            console.log('Disconnected from watch party');
            setConnected(false);
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            ws.current?.close();
        };
    }, [roomId, username, skipConnection]);

    const sendMessage = (type: string, data: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type,
                data,
                timestamp: new Date().toISOString(),
            }));
        }
    };

    const play = (currentTime: number) => {
        sendMessage('play', { currentTime });
    };

    const pause = (currentTime: number) => {
        sendMessage('pause', { currentTime });
    };

    const seek = (time: number) => {
        sendMessage('seek', { time });
    };

    const syncTime = (currentTime: number) => {
        // Send a sync message without triggering a full state update affecting the UI immediately
        if (ws.current?.readyState === WebSocket.OPEN) {
            // We use 'seek' type but with a special flag or just 'sync' if backend supports it
            // For now, let's use 'seek' but with a flag to indicate it's a soft sync/heartbeat
            // Or better, just send 'play' with current time if playing, which acts as a heartbeat

            // sending 'sync' type which we handle in onmessage to update state silently
            ws.current.send(JSON.stringify({
                type: 'sync',
                data: {
                    isPlaying: true, // Assuming sync is only called when playing
                    currentTime,
                    lastUpdateBy: username,
                    updatedAt: new Date().toISOString()
                },
                timestamp: new Date().toISOString(),
            }));
        }
    };

    const sendChat = (message: string) => {
        sendMessage('chat', { message });
    };

    return {
        connected,
        users,
        videoState,
        play,
        pause,
        seek,
        syncTime,
        sendChat,
        ws,
        myUserId,
    };
};

// 3. Example Video Player Component with Watch Party

interface WatchPartyPlayerProps {
    roomId: string;
    username: string;
    videoUrl: string;
    // Optional: Pass existing watch party state to share connection
    existingState?: WatchPartyState;
}

export const WatchPartyPlayer: React.FC<WatchPartyPlayerProps> = ({
    roomId,
    username,
    videoUrl,
    existingState,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Use existing state if provided, otherwise create new connection
    // We pass skipConnection=true if existingState is provided to avoid double connection
    const hookState = useWatchParty(roomId, username, !!existingState);
    const { videoState, play, pause, seek, syncTime } = existingState || hookState;

    const [needsInteraction, setNeedsInteraction] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Heartbeat: The "leader" (last person to update) sends their time every 2 seconds
    useEffect(() => {
        if (!videoState?.isPlaying || videoState.lastUpdateBy !== username) return;

        const interval = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                // Use the exposed syncTime function
                if (existingState || hookState) { // check if state exists
                    (existingState || hookState).syncTime(videoRef.current.currentTime);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [videoState?.isPlaying, videoState?.lastUpdateBy, username, existingState, hookState]);


    // Handle video state changes from other users
    useEffect(() => {
        if (!videoRef.current || !videoState) return;

        const video = videoRef.current;
        const drift = video.currentTime - videoState.currentTime;
        const absDrift = Math.abs(drift);

        // console.log('Video state changed:', videoState, 'Drift:', drift);

        // 1. Hard Seek if drift is too large (> 1.5s)
        if (absDrift > 1.5) {
            console.log(`Hard sync: Seeking from ${video.currentTime} to ${videoState.currentTime}`);
            video.currentTime = videoState.currentTime;
            video.playbackRate = 1; // Reset speed
        }
        // 2. Soft Sync (Playback Rate) if drift is small (0.25s - 1.5s)
        else if (absDrift > 0.25) {
            if (drift > 0) {
                // We are ahead, slow down
                console.log('Soft sync: Slowing down (0.95x)');
                video.playbackRate = 0.95;
            } else {
                // We are behind, speed up
                console.log('Soft sync: Speeding up (1.05x)');
                video.playbackRate = 1.05;
            }
        }
        // 3. In Sync (< 0.25s), reset to normal speed
        else {
            if (video.playbackRate !== 1) {
                console.log('Sync stabilized: Resetting speed (1.0x)');
                video.playbackRate = 1;
            }
        }

        // Sync play/pause state
        if (videoState.isPlaying && video.paused) {
            console.log('Playing video');
            video.play().catch(err => {
                console.error('Play error:', err);
                if (err.name === 'NotAllowedError') {
                    setNeedsInteraction(true);
                }
            });
        } else if (!videoState.isPlaying && !video.paused) {
            console.log('Pausing video');
            video.pause();
        }
    }, [videoState]);

    const handlePlay = () => {
        if (!videoRef.current) return;
        setNeedsInteraction(false);
        // Check if we are already playing to avoid loop
        if (videoState?.isPlaying) return;

        setIsSyncing(true);
        play(videoRef.current.currentTime);
        setTimeout(() => setIsSyncing(false), 100);
    };

    const handlePause = () => {
        if (!videoRef.current) return;
        // Check if we are already paused to avoid loop
        if (!videoState?.isPlaying && videoState !== null) return;

        setIsSyncing(true);
        pause(videoRef.current.currentTime);
        setTimeout(() => setIsSyncing(false), 100);
    };

    const handleSeeked = () => {
        if (!videoRef.current || isSyncing) return; // Ignore if triggered by our own sync

        // Only send seek if it's a manual user interaction, not a soft/hard sync adjustment
        // This is tricky to detect perfectly, but checking drift might help
        // For now, relying on the 'isSyncing' flag (which we set to false too quickly potentially?)
        // Let's rely on the fact that 'seeked' event fires after a hard seek check (step 1 above)
        // If we just Hard Seeked, we don't want to send another seek message back.
        // But hard seek doesn't set isSyncing=true...

        // Simplified: User manual seek usually implies a large jump or UI interaction
        // Let's just debounce or check if state is already close?
        // For now, proceed as before but be careful.

        if (videoState && Math.abs(videoRef.current.currentTime - videoState.currentTime) < 2) {
            // If we are close to the target state, it might be a sync seek.
            // But valid manual seeks can be small too.
            return;
        }

        setIsSyncing(true);
        seek(videoRef.current.currentTime);
        setTimeout(() => setIsSyncing(false), 500); // Increased debounce
    };

    const handleInteractionClick = () => {
        if (videoRef.current) {
            videoRef.current.play().then(() => {
                setNeedsInteraction(false);
            }).catch(e => console.error("Still error playing:", e));
        }
    };

    return (
        <div className="watch-party-container">
            <div className="video-wrapper" style={{ position: 'relative' }}>
                <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSeeked={handleSeeked}
                    style={{ width: '100%', maxWidth: '800px' }}
                />

                {needsInteraction && (
                    <div
                        onClick={handleInteractionClick}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            zIndex: 10
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>▶️</div>
                        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>Click to Sync Video</div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 4. Example: Create Room API call
export const createWatchPartyRoom = async (movieId: string, roomName: string, username: string) => {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/rooms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            movieId,
            roomName,
            username,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to create room');
    }

    return await response.json();
};

// 5. Example: Get Movies API call
export const getMovies = async () => {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/movies`);

    if (!response.ok) {
        throw new Error('Failed to fetch movies');
    }

    return await response.json();
};
