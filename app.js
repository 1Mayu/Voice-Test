const peerConnections = {};
let localStream = null;
const serverConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

const status = document.getElementById('status');
const friendLinkInput = document.getElementById('friendLink');
const connectBtn = document.getElementById('connectBtn');
const createLinkBtn = document.getElementById('createLinkBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const landingPage = document.getElementById('landingPage');
const chatPage = document.getElementById('chatPage');
const remoteAudioContainer = document.getElementById('remoteAudioContainer');

async function startLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error('Error accessing media devices.', err);
    }
}

async function createPeerConnection(friendId) {
    const peerConnection = new RTCPeerConnection(serverConfig);
    peerConnections[friendId] = peerConnection;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            sendSignal(friendId, { type: 'candidate', candidate: event.candidate });
        }
    };

    peerConnection.ontrack = event => {
        const remoteAudio = document.createElement('audio');
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.autoplay = true;
        remoteAudio.addEventListener('playing', () => {
            // Blink animation when audio is playing
            remoteAudioContainer.classList.add('blink');
            setTimeout(() => {
                remoteAudioContainer.classList.remove('blink');
            }, 500); // Duration of blink animation
        });
        remoteAudioContainer.appendChild(remoteAudio);
    };

    return peerConnection;
}

async function handleSignal(signal) {
    const { type, friendId, offer, answer, candidate } = signal;
    if (type === 'offer') {
        const peerConnection = await createPeerConnection(friendId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendSignal(friendId, { type: 'answer', answer });
    } else if (type === 'answer') {
        const peerConnection = peerConnections[friendId];
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } else if (type === 'candidate') {
        const peerConnection = peerConnections[friendId];
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
}

function sendSignal(friendId, signal) {
    // Implement signaling mechanism here
}

async function connectToFriend() {
    const friendId = friendLinkInput.value;
    if (!friendId) {
        status.textContent = 'Please enter a friend link.';
        return;
    }

    if (!localStream) {
        await startLocalStream();
    }

    const peerConnection = await createPeerConnection(friendId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    sendSignal(friendId, { type: 'offer', offer });
    status.textContent = 'Connecting to friend...';

    // Navigate to chat page
    landingPage.style.display = 'none';
    chatPage.style.display = 'block';
}

function createFriendLink() {
    const friendId = Math.random().toString(36).substring(2, 15);
    friendLinkInput.value = friendId;
    status.textContent = `Friend link: ${friendId}`;
}

function disconnect() {
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;

    // Navigate back to landing page
    landingPage.style.display = 'block';
    chatPage.style.display = 'none';
}

connectBtn.addEventListener('click', connectToFriend);
createLinkBtn.addEventListener('click', createFriendLink);
disconnectBtn.addEventListener('click', disconnect);

// Handle incoming signals
window.handleSignal = handleSignal;
