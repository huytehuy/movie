import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import type { Instance, SignalData } from 'simple-peer';

interface User {
    id: string;
    username: string;
}

interface VideoCallProps {
    roomId: string;
    myUserId: string;
    users: User[];
    wsRef: React.MutableRefObject<WebSocket | null>;
}

interface PeerConnection {
    peer: Instance;
    userId: string;
    username: string;
}

export function VideoCall({ roomId, myUserId, users, wsRef }: VideoCallProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState('');

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const peersRef = useRef<Map<string, PeerConnection>>(new Map());

    // Request camera/mic permissions
    const startLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240 },
                audio: true,
            });

            setLocalStream(stream);
            setPermissionGranted(true);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            console.log('Local stream started');
        } catch (err: any) {
            console.error('Error accessing media devices:', err);
            setError('Camera/Microphone access denied');
        }
    };

    // Create peer connection for a new user
    const createPeer = (userId: string, username: string, initiator: boolean) => {
        if (!localStream || !wsRef.current) return null;

        console.log(`Creating peer for ${username} (${userId}), initiator: ${initiator}`);

        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: localStream,
        });

        peer.on('signal', (data: SignalData) => {
            const messageType = data.type === 'offer' ? 'offer' :
                data.type === 'answer' ? 'answer' :
                    'ice-candidate';

            wsRef.current?.send(JSON.stringify({
                type: messageType,
                to: userId,
                data: data,
            }));

            console.log(`Sent ${messageType} to ${username}`);
        });

        peer.on('stream', (stream: MediaStream) => {
            console.log(`Received stream from ${username}`);
            // Stream will be handled by the component
        });

        peer.on('error', (err: Error) => {
            console.error(`Peer error with ${username}:`, err);
        });

        peer.on('close', () => {
            console.log(`Connection closed with ${username}`);
        });

        const peerConnection: PeerConnection = { peer, userId, username };
        peersRef.current.set(userId, peerConnection);
        setPeers(new Map(peersRef.current));

        return peerConnection;
    };

    // Handle WebRTC signaling messages
    useEffect(() => {
        if (!wsRef.current) return;

        const handleMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data);

            if (message.type === 'offer') {
                console.log('Received offer from', message.userId);
                const username = users.find(u => u.id === message.userId)?.username || 'Unknown';
                const peerConn = createPeer(message.userId, username, false);

                if (peerConn) {
                    peerConn.peer.signal(message.data);
                }
            } else if (message.type === 'answer') {
                console.log('Received answer from', message.userId);
                const peerConn = peersRef.current.get(message.userId);

                if (peerConn) {
                    peerConn.peer.signal(message.data);
                }
            } else if (message.type === 'ice-candidate') {
                console.log('Received ICE candidate from', message.userId);
                const peerConn = peersRef.current.get(message.userId);

                if (peerConn && message.data.candidate) {
                    peerConn.peer.signal(message.data);
                }
            }
        };

        wsRef.current.addEventListener('message', handleMessage);

        return () => {
            wsRef.current?.removeEventListener('message', handleMessage);
        };
    }, [wsRef, users, localStream]);

    // Handle new users joining
    useEffect(() => {
        if (!localStream || !permissionGranted) return;

        // Create peers for users that don't have connections yet
        users.forEach(user => {
            if (user.id !== myUserId && !peersRef.current.has(user.id)) {
                // Only initiate if our ID is "greater" to avoid duplicate connections
                if (myUserId > user.id) {
                    createPeer(user.id, user.username, true);
                }
            }
        });

        // Clean up peers for users who left
        peersRef.current.forEach((peerConn, userId) => {
            if (!users.find(u => u.id === userId)) {
                peerConn.peer.destroy();
                peersRef.current.delete(userId);
                setPeers(new Map(peersRef.current));
            }
        });
    }, [users, localStream, permissionGranted, myUserId]);

    // Toggle audio
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    // Toggle video
    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            localStream?.getTracks().forEach(track => track.stop());
            peersRef.current.forEach(peerConn => peerConn.peer.destroy());
        };
    }, [localStream]);

    // Drag functionality
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && dragStartRef.current) {
            e.preventDefault();
            const newX = e.clientX - dragStartRef.current.x;
            const newY = e.clientY - dragStartRef.current.y;

            // Boundary checks (optional, but good for UX)
            const maxX = window.innerWidth - 320; // approximate width
            const maxY = window.innerHeight - 200; // approximate height

            setPosition({
                x: Math.min(Math.max(0, newX), maxX),
                y: Math.min(Math.max(0, newY), maxY)
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Touch support for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        const touch = e.touches[0];
        dragStartRef.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        };
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (isDragging && dragStartRef.current) {
            e.preventDefault(); // Prevent scrolling while dragging
            const touch = e.touches[0];
            const newX = touch.clientX - dragStartRef.current.x;
            const newY = touch.clientY - dragStartRef.current.y;

            // Boundary checks
            const maxX = window.innerWidth - 50;
            const maxY = window.innerHeight - 50;

            setPosition({
                x: Math.min(Math.max(0, newX), maxX),
                y: Math.min(Math.max(0, newY), maxY)
            });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
        } else {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        }
        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging]);


    if (!permissionGranted) {
        return (
            <div style={styles.container}>
                <div style={styles.enablePrompt}>
                    <h3>📹 Enable Video Call</h3>
                    {error ? (
                        <p style={styles.error}>{error}</p>
                    ) : (
                        <p>Click to start video calling with others in the room</p>
                    )}
                    <button onClick={startLocalStream} style={styles.enableButton}>
                        Enable Camera & Mic
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                ...styles.container,
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 1000,
                cursor: isDragging ? 'grabbing' : 'grab',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)', // Make it defined so it's visible over movie
                backdropFilter: 'blur(4px)',
                touchAction: 'none' // Prevent scrolling on container
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            <h3 style={styles.header}>👥 Video Call ({users.length} viewers)</h3>

            <div style={styles.controls} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                <button
                    onClick={toggleMute}
                    style={{
                        ...styles.controlButton,
                        backgroundColor: isMuted ? '#f44336' : '#4CAF50'
                    }}
                >
                    {isMuted ? '🔇' : '🎤'}
                </button>

                <button
                    onClick={toggleVideo}
                    style={{
                        ...styles.controlButton,
                        backgroundColor: isVideoOff ? '#f44336' : '#4CAF50'
                    }}
                >
                    {isVideoOff ? '📷 Off' : '📹 On'}
                </button>
            </div>

            <div style={styles.videosGrid}>
                {/* Local video */}
                <div style={styles.videoContainer}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        style={styles.video}
                    />
                    <div style={styles.videoLabel}>You</div>
                </div>

                {/* Remote videos */}
                {Array.from(peers.values()).map(peerConn => (
                    <RemoteVideo
                        key={peerConn.userId}
                        peerConnection={peerConn}
                    />
                ))}
            </div>
        </div>
    );
}

// Remote video component
function RemoteVideo({ peerConnection }: { peerConnection: PeerConnection }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const handleStream = (stream: MediaStream) => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        };

        peerConnection.peer.on('stream', handleStream);

        return () => {
            peerConnection.peer.off('stream', handleStream);
        };
    }, [peerConnection.peer]);

    return (
        <div style={styles.videoContainer}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={styles.video}
            />
            <div style={styles.videoLabel}>{peerConnection.username}</div>
        </div>
    );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '10px',
        borderRadius: '8px',
        color: 'white',
        width: 'auto',
        maxWidth: '300px', // Limit width to not cover too much
        // Removed fixed positioning from here as it's now inline
    },
    header: {
        margin: '0 0 10px 0',
        fontSize: '14px',
        textShadow: '1px 1px 2px black',
        userSelect: 'none'
    },
    enablePrompt: {
        textAlign: 'center',
        padding: '20px',
    },
    enableButton: {
        padding: '8px 16px',
        fontSize: '14px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '10px',
    },
    error: {
        color: '#f44336',
    },
    controls: {
        display: 'flex',
        gap: '5px',
        marginBottom: '10px',
        justifyContent: 'center'
    },
    controlButton: {
        padding: '5px 10px',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '12px',
        minWidth: '60px'
    },
    videosGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', // Auto-adjust based on content
        gap: '5px',
        maxHeight: '400px', // Limit height
        overflowY: 'auto'
    },
    videoContainer: {
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '5px',
        overflow: 'hidden',
        minWidth: '100px'
    },
    video: {
        width: '100%',
        height: 'auto',
        display: 'block',
        minHeight: '80px',
        objectFit: 'cover',
    },
    videoLabel: {
        position: 'absolute',
        bottom: '2px',
        left: '2px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '2px 5px',
        borderRadius: '3px',
        fontSize: '10px',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },
};
