// --- WhatsApp & Mobile Browser Background Detection ---
const isWhatsAppBrowser = /WhatsApp/i.test(navigator.userAgent);
const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isWhatsAppBrowser || isMobileUA) {
    document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('mobile-bg');
    });
}

// --- YouTube Playlist Integration ---
const GUJARATI_PLAYLIST = 'PLUzteH3czVO7pn8x3c70DQVJw36TgDLgM';
const HINDI_PLAYLIST = 'PL0umg_TNpoZTTdZVIi5tfX69pRmoMFGna';
let PLAYLIST_ID = GUJARATI_PLAYLIST;
let currentLang = 'gujarati'; // 'gujarati' or 'hindi'
let player;
let isPlaying = false;
let progressInterval;

// Car Horn Sound
const hornSound = new Audio("dragon-studio-boat-horn-386178.mp3");

// DOM Elements
const playBtn = document.querySelector('.play-btn-main');
const prevBtn = document.querySelectorAll('.player-controls .icon-btn')[1];
const nextBtn = document.querySelectorAll('.player-controls .icon-btn')[2];
const playerContainer = document.querySelector('.player');

const trackTitle = document.querySelector('.track-title');
const trackArtist = document.querySelector('.track-artist');
const albumArt = document.querySelector('.album-art');

const currentTimeEl = document.querySelector('.current-time');
const totalTimeEl = document.querySelector('.total-time');
const progress = document.querySelector('.progress');
const progressBar = document.querySelector('.progress-bar');
const hornBtn = document.querySelector('.horn-btn');

// --- YouTube IFrame API Initialization ---
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
if (firstScriptTag) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function() {
    player = new YT.Player('yt-player', {
        height: '200',
        width: '200',
        playerVars: {
            listType: 'playlist',
            list: PLAYLIST_ID,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            autoplay: 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
};

let hasStartedRandomPlay = false;

function playRandomTrack() {
    if (!player) return false;
    if (typeof player.getPlaylist === 'function') {
        const playlist = player.getPlaylist();
        if (playlist && playlist.length > 0) {
            const randomIndex = Math.floor(Math.random() * playlist.length);
            if (typeof player.setShuffle === 'function') {
                player.setShuffle(true);
            }
            if (typeof player.playVideoAt === 'function') {
                player.playVideoAt(randomIndex);
                return true;
            }
        }
    }
    return false;
}

function onPlayerReady(event) {
    event.target.setVolume(100);
    if (typeof event.target.setShuffle === 'function') {
        event.target.setShuffle(true);
    }
    isPlaying = false;
    hasStartedRandomPlay = false;
    
    // Poll immediately for playlist data as YouTube iframe initializes
    let tries = 0;
    const initPoll = setInterval(() => {
        tries++;
        updateUIState();
        if ((player && player.getVideoData && player.getVideoData().title) || 
            (player && player.getPlaylist && player.getPlaylist() && player.getPlaylist().length > 0) || 
            tries > 40) {
            clearInterval(initPoll);
        }
    }, 100);
}

function onPlayerStateChange(event) {
    updateUIState();
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        startProgressBar();
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        isPlaying = false;
        stopProgressBar();
    }
}

function updateUIState() {
    if (player) {
        let videoData = player.getVideoData ? player.getVideoData() : null;
        if (videoData && videoData.title && videoData.title !== "") {
            trackTitle.textContent = videoData.title;
            trackArtist.textContent = videoData.author || "Gujarati Hits";
            if (videoData.video_id) {
                albumArt.style.backgroundImage = `url('https://img.youtube.com/vi/${videoData.video_id}/hqdefault.jpg')`;
            }
        } else if (player.getPlaylist) {
            const playlist = player.getPlaylist();
            if (playlist && playlist.length > 0) {
                const firstId = playlist[0];
                albumArt.style.backgroundImage = `url('https://img.youtube.com/vi/${firstId}/hqdefault.jpg')`;
                if (titleCache[firstId]) {
                    trackTitle.textContent = titleCache[firstId];
                } else {
                    fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${firstId}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data && data.title) {
                                titleCache[firstId] = data.title;
                                trackTitle.textContent = data.title;
                                if (data.author_name) trackArtist.textContent = data.author_name;
                            }
                        })
                        .catch(() => {});
                }
            }
        }
    }

    if (isPlaying) {
        playerContainer.classList.add('playing');
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="#111"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    } else {
        playerContainer.classList.remove('playing');
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="#111"><path d="M8 5v14l11-7z"/></svg>';
    }
}

// --- Time Formatting ---
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Progress Sync ---
function startProgressBar() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (player && player.getCurrentTime) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            
            currentTimeEl.textContent = formatTime(currentTime);
            totalTimeEl.textContent = formatTime(duration);
            
            if (duration > 0) {
                const percent = (currentTime / duration) * 100;
                progress.style.width = `${percent}%`;
            }
        }
    }, 500);
}

function stopProgressBar() {
    clearInterval(progressInterval);
}

// --- Controls ---
function togglePlay() {
    if (!player) return;
    
    if (isPlaying) {
        player.pauseVideo();
        isPlaying = false;
    } else {
        if (!hasStartedRandomPlay) {
            hasStartedRandomPlay = true;
            if (playRandomTrack()) {
                isPlaying = true;
                updateUIState();
                return;
            }
        }
        player.playVideo();
        isPlaying = true;
    }
    updateUIState();
}

function nextTrack() {
    if (isShuffle && player && typeof player.getPlaylist === 'function') {
        const playlist = player.getPlaylist();
        if (playlist && playlist.length > 1) {
            const randomIndex = Math.floor(Math.random() * playlist.length);
            player.playVideoAt(randomIndex);
            return;
        }
    }
    if (player && player.nextVideo) player.nextVideo();
}

function prevTrack() {
    if (player && player.previousVideo) player.previousVideo();
}

let isScrubbing = false;
let pendingSeekTime = 0;

function handleSeek(e, isFinal = false) {
    if (!player || !player.getDuration || !progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    if (clientX === undefined) return;
    
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const duration = player.getDuration();
    
    if (duration && rect.width > 0) {
        const percent = (offsetX / rect.width) * 100;
        progress.style.width = `${percent}%`;
        pendingSeekTime = (offsetX / rect.width) * duration;
        currentTimeEl.textContent = formatTime(pendingSeekTime);
        
        if (isFinal && typeof player.seekTo === 'function') {
            player.seekTo(pendingSeekTime, true);
        }
    }
}

if (progressBar) {
    progressBar.addEventListener('pointerdown', (e) => {
        isScrubbing = true;
        handleSeek(e, false);
    });

    window.addEventListener('pointermove', (e) => {
        if (isScrubbing) {
            handleSeek(e, false);
        }
    });

    window.addEventListener('pointerup', (e) => {
        if (isScrubbing) {
            isScrubbing = false;
            if (player && typeof player.seekTo === 'function') {
                player.seekTo(pendingSeekTime, true);
            }
        }
    });

    progressBar.addEventListener('click', (e) => {
        handleSeek(e, true);
    });
}

playBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

// --- Shuffle Toggle ---
let isShuffle = true;
const shuffleBtn = document.getElementById('shuffle-btn') || document.querySelectorAll('.player-controls .icon-btn')[0];

if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
        isShuffle = !isShuffle;
        if (isShuffle) {
            shuffleBtn.classList.add('active');
            shuffleBtn.style.color = '#ffb800';
            playRandomTrack();
        } else {
            shuffleBtn.classList.remove('active');
            shuffleBtn.style.color = '';
            if (player && typeof player.setShuffle === 'function') {
                player.setShuffle(false);
            }
        }
    });
}

// --- Volume Control ---
const volumeSlider = document.getElementById('volume-slider');
const volumeBtn = document.querySelector('.volume-btn');

if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(e.target.value);
            if(player.isMuted()) player.unMute();
        }
    });
}

if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
        if (player && typeof player.isMuted === 'function') {
            if (player.isMuted()) {
                player.unMute();
                volumeSlider.value = player.getVolume();
            } else {
                player.mute();
                volumeSlider.value = 0;
            }
        }
    });
}

// --- Horn Logic ---
function playHorn() {
    hornBtn.style.transform = 'scale(0.95)';
    setTimeout(() => hornBtn.style.transform = 'scale(1)', 150);
    hornSound.currentTime = 0;
    hornSound.play();
}

hornBtn.addEventListener('click', playHorn);

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    } else if (e.code === 'KeyH') {
        playHorn();
    } else if (e.code === 'ArrowRight') {
        if (player && player.getCurrentTime) {
            player.seekTo(player.getCurrentTime() + 5, true);
        }
    } else if (e.code === 'ArrowLeft') {
        if (player && player.getCurrentTime) {
            player.seekTo(player.getCurrentTime() - 5, true);
        }
    } else if (e.code === 'KeyN') {
        nextTrack();
    } else if (e.code === 'KeyP') {
        prevTrack();
    }
});

// --- Clock ---
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const clockEl = document.getElementById('clock');
    if(clockEl) {
        clockEl.innerHTML = `${hours}:${minutes} <span class="seconds">${seconds}</span>`;
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- Real-time Passengers Counter (Vercel Ready) ---
const passengersEl = document.getElementById('passengers-count') || document.querySelector('.passengers');

async function initPassengerCounter() {
    if (!passengersEl) return;
    
    const namespace = "auto-rikshaw";
    const key = "passengers-count";
    
    try {
        let count = 1;
        const hasVisited = sessionStorage.getItem('rickshaw_passenger_logged');
        
        if (!hasVisited) {
            sessionStorage.setItem('rickshaw_passenger_logged', 'true');
            const res = await fetch(`https://api.counterapi.dev/v1/${namespace}/${key}/up`);
            const data = await res.json();
            if (data && typeof data.count === 'number') count = data.count;
        } else {
            const res = await fetch(`https://api.counterapi.dev/v1/${namespace}/${key}`);
            const data = await res.json();
            if (data && typeof data.count === 'number') count = data.count;
        }

        passengersEl.innerHTML = `&bull; ${count} PASSENGER${count === 1 ? '' : 'S'}`;
    } catch (err) {
        console.log("Passenger counter fallback:", err);
        passengersEl.innerHTML = `&bull; 1 PASSENGER`;
    }
}

initPassengerCounter();

// --- Language Toggle ---
const langToggle = document.getElementById('lang-toggle');
const langText = document.getElementById('lang-text');
const langIndicator = document.getElementById('lang-indicator');

if (langToggle) {
    langToggle.addEventListener('click', () => {
        langToggle.classList.add('switching');
        setTimeout(() => langToggle.classList.remove('switching'), 400);

        const hugeTitle = document.querySelector('.huge-title');
        const hornHi = document.querySelector('.horn-hi');
        
        if (currentLang === 'gujarati') {
            currentLang = 'hindi';
            PLAYLIST_ID = HINDI_PLAYLIST;
            langText.textContent = 'કંઈક ગુજરાતી વગાડ ને વાલા !';
            langIndicator.textContent = 'हिंदी';
            if (hugeTitle) {
                hugeTitle.textContent = 'ऑटो रिक्शा';
                hugeTitle.classList.add('lang-hindi');
            }
            if (hornHi) {
                hornHi.textContent = 'हॉर्न ओके प्लीज';
            }
        } else {
            currentLang = 'gujarati';
            PLAYLIST_ID = GUJARATI_PLAYLIST;
            langText.textContent = 'अरे चाचा कुछ दिल को लगे ऐसा बजाओ ना';
            langIndicator.textContent = 'ગુજરાતી';
            if (hugeTitle) {
                hugeTitle.textContent = 'ઓટો રિક્ષા';
                hugeTitle.classList.remove('lang-hindi');
            }
            if (hornHi) {
                hornHi.textContent = 'હૉર્ન ઓકે પ્લીઝ';
            }
        }
        
        // Destroy old player and recreate with new playlist
        if (player) {
            player.destroy();
        }
        
        // Recreate the div for the player
        const container = document.getElementById('yt-player-container');
        container.innerHTML = '<div id="yt-player"></div>';
        
        player = new YT.Player('yt-player', {
            height: '200',
            width: '200',
            playerVars: {
                listType: 'playlist',
                list: PLAYLIST_ID,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                autoplay: 1
            },
            events: {
                'onReady': function(event) {
                    event.target.setVolume(100);
                    hasStartedRandomPlay = true;
                    playRandomTrack();
                },
                'onStateChange': onPlayerStateChange
            }
        });
        
        // Animate the button
        langToggle.style.transform = 'scale(0.95)';
        setTimeout(() => { langToggle.style.transform = ''; }, 200);
    });
}

// --- Playlist Modal Logic ---
const playlistBtn = document.querySelector('.playlist-btn');
const playlistModal = document.getElementById('playlist-modal');
const closeModalBtn = document.querySelector('.close-modal');
const loadPlaylistBtn = document.getElementById('load-playlist-btn');
const playlistInput = document.getElementById('playlist-input');
const trackListEl = document.getElementById('track-list');
const trackCountEl = document.getElementById('track-count');

if (playlistBtn) {
    playlistBtn.addEventListener('click', () => {
        playlistModal.classList.add('active');
        renderTrackList();
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        playlistModal.classList.remove('active');
    });
}

// --- Meter Box Logic ---
const meterBox = document.getElementById('meter-box');
const profileBtnTop = document.getElementById('profile-btn');

if (profileBtnTop && meterBox) {
    profileBtnTop.addEventListener('click', (e) => {
        e.stopPropagation();
        meterBox.classList.toggle('active');
    });
}

// --- DIAMOND ELECTRIC RICKSHAW METER ENGINE ---
const diamondMeterWidget = document.getElementById('diamond-meter-widget');
const meterFlagLever = document.getElementById('meter-flag-lever');
const meterFareVal = document.getElementById('meter-fare-val');
const meterDistVal = document.getElementById('meter-dist-val');
const meterWaitVal = document.getElementById('meter-wait-val');
const meterStatusBox = document.getElementById('meter-status-box');
const meterStatusText = document.getElementById('meter-status-text');

let isMeterHired = false;
let meterTimer = null;
let meterElapsedSeconds = 0;
let baseFare = 23.00;

// --- Mechanical Meter Lever Sound (Plays meter sound.mp3) ---
const meterAudio = new Audio('meter sound.mp3');

function playMeterSound() {
    try {
        meterAudio.currentTime = 0;
        meterAudio.play().catch(err => {
            console.log("Audio play prevented:", err);
        });
    } catch (e) {
        console.error("Meter Audio Error:", e);
    }
}

function toggleDiamondMeter() {
    playMeterSound();
    isMeterHired = !isMeterHired;
    
    if (isMeterHired) {
        // Turn ON (HIRED / METER DOWN)
        if (meterFlagLever) meterFlagLever.classList.add('hired');
        if (meterStatusBox) {
            meterStatusBox.classList.remove('vacant');
            meterStatusBox.classList.add('hired');
        }
        if (meterStatusText) meterStatusText.textContent = 'HIRED / ચાલૂ';
        
        // Start Meter Engine
        meterElapsedSeconds = 0;
        updateMeterDisplay();
        
        clearInterval(meterTimer);
        meterTimer = setInterval(() => {
            meterElapsedSeconds++;
            updateMeterDisplay();
        }, 1000);
    } else {
        // Turn OFF (VACANT / METER UP)
        if (meterFlagLever) meterFlagLever.classList.remove('hired');
        if (meterStatusBox) {
            meterStatusBox.classList.remove('hired');
            meterStatusBox.classList.add('vacant');
        }
        if (meterStatusText) meterStatusText.textContent = 'VACANT / ખાલી';
        
        clearInterval(meterTimer);
        meterElapsedSeconds = 0;
        if (meterFareVal) meterFareVal.textContent = '0.00';
        if (meterDistVal) meterDistVal.textContent = '0.00';
        if (meterWaitVal) meterWaitVal.textContent = '00:00';
    }
}

function updateMeterDisplay() {
    if (!isMeterHired) return;
    
    const distKM = (meterElapsedSeconds * 0.005).toFixed(2);
    const mins = String(Math.floor(meterElapsedSeconds / 60)).padStart(2, '0');
    const secs = String(meterElapsedSeconds % 60).padStart(2, '0');
    const waitStr = `${mins}:${secs}`;
    const calculatedFare = (baseFare + (parseFloat(distKM) * 15.0) + ((meterElapsedSeconds / 60) * 1.5)).toFixed(2);
    
    if (meterFareVal) meterFareVal.textContent = calculatedFare;
    if (meterDistVal) meterDistVal.textContent = distKM;
    if (meterWaitVal) meterWaitVal.textContent = waitStr;
}

if (diamondMeterWidget) {
    diamondMeterWidget.addEventListener('click', toggleDiamondMeter);
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    // Playlist Modal
    if (playlistModal && playlistModal.classList.contains('active')) {
        const modalContent = document.querySelector('.modal-content');
        if (modalContent && !modalContent.contains(e.target) && !playlistBtn.contains(e.target)) {
            playlistModal.classList.remove('active');
        }
    }
    
    // Meter Box
    if (meterBox && meterBox.classList.contains('active')) {
        if (!meterBox.contains(e.target) && !profileBtnTop.contains(e.target)) {
            meterBox.classList.remove('active');
        }
    }
});

if (loadPlaylistBtn) {
    loadPlaylistBtn.addEventListener('click', () => {
        let val = playlistInput.value.trim();
        if (!val) return;
        
        let newId = val;
        if (val.includes('list=')) {
            const urlParams = new URLSearchParams(val.substring(val.indexOf('?')));
            newId = urlParams.get('list');
        }
        
        if (newId && player) {
            player.loadPlaylist({list: newId});
            playlistModal.classList.remove('active');
        }
    });
}

const titleCache = {};

function renderTrackList() {
    if (!player || !player.getPlaylist) return;
    const playlist = player.getPlaylist();
    const currentIndex = player.getPlaylistIndex();
    
    if (playlist) {
        trackCountEl.textContent = playlist.length;
        trackListEl.innerHTML = '';
        
        playlist.forEach((videoId, index) => {
            const div = document.createElement('div');
            div.className = `track-item ${index === currentIndex ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.className = 'track-thumb';
            img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'track-title';
            
            let title = `Track ${index + 1}`;
            
            // Check if it's the current track, we can pull directly from player
            if (index === currentIndex && player.getVideoData) {
                const data = player.getVideoData();
                if (data && data.title) {
                    title = data.title;
                    titleCache[videoId] = title;
                }
            }
            
            if (titleCache[videoId]) {
                titleSpan.textContent = titleCache[videoId];
            } else {
                titleSpan.textContent = title;
                // Fetch the real title asynchronously from public oEmbed proxy
                fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.title) {
                            titleCache[videoId] = data.title;
                            titleSpan.textContent = data.title;
                        }
                    })
                    .catch(err => console.log('Failed to fetch title for', videoId));
            }
            
            div.appendChild(img);
            div.appendChild(titleSpan);
            
            div.addEventListener('click', () => {
                player.playVideoAt(index);
                playlistModal.classList.remove('active');
            });
            trackListEl.appendChild(div);
        });
    }
}
