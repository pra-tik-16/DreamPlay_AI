/* ==========================================
   DreamPlay AI - Main JavaScript
   Author: P2RSV
   ========================================== */

'use strict';

// ==================== DEVICE DETECTION ====================
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent);
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

console.log('Device Info:', {
    mobile: isMobile,
    tablet: isTablet,
    touch: isTouchDevice
});

// ==================== VIDEO HANDLING ====================
const heroVideo = document.querySelector('.hero-video');
const videoPlaceholder = document.querySelector('.hero-video-placeholder');

if (heroVideo) {
    // Disable video on mobile devices to save bandwidth
    if (isMobile && window.innerWidth < 768) {
        heroVideo.style.display = 'none';
        videoPlaceholder.style.display = 'block';
        console.log('Video disabled on mobile for performance');
    } else {
        // Video error handling
        heroVideo.addEventListener('error', function() {
            console.log('Video failed to load, showing placeholder');
            heroVideo.style.display = 'none';
            videoPlaceholder.style.display = 'block';
        });

        // Video loaded successfully
        heroVideo.addEventListener('loadeddata', function() {
            console.log('Video loaded successfully');
            videoPlaceholder.style.display = 'none';
        });

        // Pause video when page is not visible (battery saving)
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                heroVideo.pause();
            } else {
                heroVideo.play().catch(err => {
                    console.log('Video autoplay prevented:', err);
                });
            }
        });
    }
}

// ==================== TEMPLATE LOADER ====================
function loadGameTemplate(gameType, schema) {
    if (!gameCanvas) return;

    gameCanvas.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = "800px";
    iframe.style.border = 'none';

    iframe.src = `/templates/${gameType}/index.html`;

    iframe.onload = function () {
        // Send schema to template after it loads
        iframe.contentWindow.postMessage(
            { type: 'INIT_GAME', payload: schema },
            '*'
        );
    };

    gameCanvas.appendChild(iframe);
}




function setViewportHeight() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);

// ==================== PREVENT ZOOM ON INPUT (iOS) ====================
if (isMobile) {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function(e) {
            if (this.style.fontSize !== '16px') {
                this.style.fontSize = '16px';
            }
        });
    });
}

// ==================== TOUCH FEEDBACK ====================
if (isTouchDevice) {
    const touchElements = document.querySelectorAll('.suggestion-card, .cta-button, .generate-button, .control-btn');
    
    touchElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.style.opacity = '0.8';
        });
        
        element.addEventListener('touchend', function() {
            this.style.opacity = '1';
        });
        
        element.addEventListener('touchcancel', function() {
            this.style.opacity = '1';
        });
    });
}

// ==================== MOBILE MENU TOGGLE ====================
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.getElementById('navLinks');

if (mobileMenuToggle && navLinks) {
    // Toggle menu
    mobileMenuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        navLinks.classList.toggle('active');
        this.innerHTML = navLinks.classList.contains('active') ? '✕' : '☰';
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('nav') && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            mobileMenuToggle.innerHTML = '☰';
        }
    });

    // Prevent menu close when clicking inside nav
    navLinks.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// ==================== SMOOTH SCROLL ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            const offsetTop = target.offsetTop - (isMobile ? 60 : 80);
            
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            
            // Close mobile menu after clicking
            if (isMobile && navLinks) {
                navLinks.classList.remove('active');
                if (mobileMenuToggle) {
                    mobileMenuToggle.innerHTML = '☰';
                }
            }
        }
    });
});

// ==================== SUGGESTION CARDS ====================
const suggestionCards = document.querySelectorAll('.suggestion-card');

suggestionCards.forEach(card => {
    card.addEventListener('click', function() {
        const prompt = this.getAttribute('data-prompt');
        const promptInput = document.getElementById('promptInput');
        
        if (promptInput && prompt) {
            promptInput.value = prompt;
            promptInput.focus();
            
            // Smooth scroll to input on mobile
            if (isMobile) {
                promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
});

// ==================== GENERATE BUTTON ====================

const generateBtn = document.getElementById('generateBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const gameCanvas = document.getElementById('gameCanvas');

// ==================== INTENT SAFETY + SPELL CHECK ====================

// Simple bad word filter (expandable)
const blockedWords = [
    "porn", "sex", "nude", "xxx", "adult", "rape", "kill yourself",
    "fuck", "shit", "bitch"
];

// Simple spell correction dictionary
const spellFixMap = {
    "shoter": "shooter",
    "shootr": "shooter",
    "runer": "runner",
    "runnr": "runner",
    "racng": "racing"
};

function moderateAndFixPrompt(prompt) {

    let cleaned = prompt.toLowerCase();

    // Block adult/abusive content
    for (let word of blockedWords) {
        if (cleaned.includes(word)) {
            alert("Inappropriate or adult content is not allowed.");
            return null;
        }
    }

    // Basic spell correction
    Object.keys(spellFixMap).forEach(wrong => {
        if (cleaned.includes(wrong)) {
            cleaned = cleaned.replaceAll(wrong, spellFixMap[wrong]);
            console.log(`Did you mean: ${spellFixMap[wrong]} ?`);
        }
    });

    return cleaned;
}

// Detect vague prompts (for clarification logic)
function isPromptVague(prompt) {
    const vagueWords = ["game", "make game", "create game", "fun game"];
    return vagueWords.includes(prompt.trim());
}




if (generateBtn) {
    generateBtn.addEventListener('click', function() {
        const promptInput = document.getElementById('promptInput');
        let prompt = promptInput ? promptInput.value.trim() : '';

prompt = moderateAndFixPrompt(prompt);
if (!prompt) return;

if (isPromptVague(prompt)) {
    alert("Can you specify the genre? Shooter, Runner, Racing, Puzzle?");
    return;
}

        
        if (!prompt) {
            alert('Please describe your game vision first.');
            if (promptInput) {
                promptInput.focus();
            }
            return;
        }
        
        // Show loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
        
        // Simulate AI generation (replace with actual API call)
       (async () => {
    const data = await generateGameFromAPI(prompt);

    // Hide loading overlay
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }

    if (!data) return;

    // Update canvas
  // Load correct game template
    // Load correct engine template from backend
loadGameTemplate(data.engine, data.schema);




    // Update stats with REAL backend data
  updateGameStats({
    type: data.engine ? data.engine.toUpperCase() : '—',
    player: data.schema?.player || data.schema?.primary_entities || '—',
    object: data.schema?.enemy || data.schema?.secondary_entities || '—',
    movement: data.schema?.core_loop || '—',
    environment: data.schema?.environment || data.schema?.environment_hint || '—'
});


    // Scroll to canvas
    const canvasSection = document.getElementById('canvas');
    if (canvasSection) {
        canvasSection.scrollIntoView({ behavior: 'smooth' });
    }
})();

    });
}

// ==================== SIMULATE GAME GENERATION ====================
function simulateGameGeneration(prompt) {
    console.log('Generating game from prompt:', prompt);
    
    // Simulate API call delay
    setTimeout(() => {
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
        
        // Update game canvas
        if (gameCanvas) {
            gameCanvas.innerHTML = '<span style="color: var(--gold);">EXPERIENCE READY</span>';
        }
        
        // Update stats with example data (replace with actual data from API)
        updateGameStats({
            type: 'SHOOTER',
            player: 'OPERATOR',
            object: 'ALIEN',
            movement: 'TACTICAL',
            environment: 'SPACE'
        });
        
        // Scroll to canvas section
        const canvasSection = document.getElementById('canvas');
        if (canvasSection) {
            canvasSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Show success message
        console.log('Game generated successfully!');
        
    }, 3500); // 3.5 second delay
}

// ==================== UPDATE GAME STATS ====================
function updateGameStats(stats) {
    const statElements = {
        type: document.getElementById('statType'),
        player: document.getElementById('statPlayer'),
        object: document.getElementById('statObject'),
        movement: document.getElementById('statMovement'),
        environment: document.getElementById('statEnvironment')
    };
    
    // Update each stat if element exists
    if (statElements.type) statElements.type.textContent = stats.type || '—';
    if (statElements.player) statElements.player.textContent = stats.player || '—';
    if (statElements.object) statElements.object.textContent = stats.object || '—';
    if (statElements.movement) statElements.movement.textContent = stats.movement || '—';
    if (statElements.environment) statElements.environment.textContent = stats.environment || '—';
}

// ==================== CONTROL BUTTONS ====================
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');

if (playBtn) {
    playBtn.addEventListener('click', function() {
        console.log('Launch game');
        // Add game launch logic here
        
        // Example: Check if game is ready
        if (gameCanvas && gameCanvas.textContent.includes('EXPERIENCE READY')) {
            console.log('Template already running');

            // Initialize your game engine here
        } else {
            alert('Please generate a game first!');
        }
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', function() {
        console.log('Reset game');
        
        // Reset canvas
        if (gameCanvas) {
            gameCanvas.textContent = 'AWAITING GENERATION';
        }
        
        // Clear prompt input
        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
            promptInput.value = '';
        }
        
        // Reset stats
        updateGameStats({
            type: '—',
            player: '—',
            object: '—',
            movement: '—',
            environment: '—'
        });
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==================== KEYBOARD SHORTCUTS ====================
const promptInput = document.getElementById('promptInput');

if (promptInput) {
    // Submit on Enter key
    promptInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (generateBtn) {
                generateBtn.click();
            }
        }
    });
    
    // Clear on Escape key
    promptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            this.blur();
        }
    });
}

// ==================== API INTEGRATION (Template) ====================
// Replace this function with your actual backend API call

async function generateGameFromAPI(prompt) {
    try {
        // Example API endpoint (replace with your actual endpoint)
        const response = await fetch("http://127.0.0.1:5000/generate_game", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt
            })
        });
        
    if (!response.ok) {
            throw new Error("Backend error");
        }

        return await response.json();
    } catch (error) {
        console.error(error);
        alert("Failed to generate game");
        return null;
    }
}



// ==================== PERFORMANCE MONITORING ====================
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log('Page load time:', pageLoadTime + 'ms');
        }, 0);
    });
}

// ==================== ERROR HANDLING ====================
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    // You can send errors to analytics or logging service here
});

// ==================== CONSOLE BRANDING ====================
console.log('%cDreamPlay AI', 'font-size: 24px; font-weight: bold; color: #d4af37;');
console.log('%cPowered by P2RSV', 'font-size: 12px; color: #c0c0c0;');
console.log('%cDream It • Play It', 'font-size: 14px; font-style: italic; color: #e5e5e5;');

// ==================== ANALYTICS (Optional) ====================
// Add your analytics tracking here
/*
function trackEvent(category, action, label) {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
}

// Example usage:
generateBtn.addEventListener('click', function() {
    trackEvent('Game', 'Generate', promptInput.value);
});
*/

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DreamPlay AI initialized');
    console.log('Device:', isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop');
    
    // Any initialization code here
});

// ==================== EXPORT FOR MODULES (if needed) ====================
// Uncomment if using ES6 modules
/*
export {
    generateGameFromAPI,
    updateGameStats,
    simulateGameGeneration
};
*/