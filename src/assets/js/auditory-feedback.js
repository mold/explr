/* 
 * Auditory Feedback Module
 * Provides audio visualization of artist density on the music map
 * for improved accessibility for blind users
 */

const auditoryFeedback = (function() {
  // Private variables
  let audioContext = null;
  let oscillator = null;
  let gainNode = null;
  let audioFeedbackEnabled = false;
  let keyboardNavigationOnly = true; // Only trigger on keyboard navigation
  let continuousTone = true; // Whether to use a continuous tone that modulates
  let isPlaying = false; // Track if the tone is currently playing
  let toneTimeout = null; // Timeout for stopping the tone
  let toneDuration = 750; // Duration in ms that the tone plays
  let lastInteractionWasKeyboard = false; // Track if the last interaction was keyboard
  
  // Initialize Web Audio API
  function init() {
    try {
      // Create audio context with user interaction to avoid autoplay restrictions
      document.addEventListener('click', function initAudioContext() {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log("Audio context initialized on user interaction");
        }
        lastInteractionWasKeyboard = false; // Mouse click, not keyboard
        document.removeEventListener('click', initAudioContext);
      }, { once: true });
      
      // Add keyboard shortcut for toggling audio feedback
      document.addEventListener('keydown', function(e) {
        // Toggle audio feedback with 'A' key
        if (e.key.toLowerCase() === 'a' && !e.repeat) {
          toggleAudioFeedback();
        }
        
        // Set flag for keyboard interaction
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
            e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          lastInteractionWasKeyboard = true;
          
          // Play feedback on arrow key navigation
          if (keyboardNavigationOnly && audioFeedbackEnabled) {
            // Small delay to allow the map to update first
            setTimeout(updateFeedback, 100);
          }
        }
      });
      
      // Track mouse interactions
      document.addEventListener('mousemove', function() {
        lastInteractionWasKeyboard = false;
      });
      
      document.addEventListener('mousedown', function() {
        lastInteractionWasKeyboard = false;
      });
      
      document.addEventListener('wheel', function() {
        lastInteractionWasKeyboard = false;
      });
      
      console.log("Auditory feedback module initialized");
      
      // Try to initialize audio context immediately if possible
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.log("Audio context will be initialized on first user interaction");
      }
    } catch (e) {
      console.error("Web Audio API is not supported in this browser", e);
    }
  }
  
  // Set up the tone audio nodes
  function setupTone() {
    if (!audioContext) return;
    
    // Clean up any existing oscillator
    if (oscillator) {
      try {
        oscillator.stop();
      } catch (e) {
        // Ignore errors if oscillator was already stopped
      }
      oscillator = null;
    }
    
    // Create oscillator and gain nodes
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    // Configure oscillator
    oscillator.type = 'sine'; // Sine wave is less harsh
    oscillator.frequency.value = 0; // Start at 0 Hz (silent)
    
    // Configure gain (volume)
    gainNode.gain.value = 0; // Start silent
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start the oscillator
    oscillator.start();
    isPlaying = true;
    
    // Schedule the tone to stop after the duration
    scheduleToneStop();
  }
  
  // Schedule the tone to stop after the duration
  function scheduleToneStop() {
    // Clear any existing timeout
    if (toneTimeout) {
      clearTimeout(toneTimeout);
    }
    
    // Set a new timeout to fade out and stop the tone
    toneTimeout = setTimeout(() => {
      if (gainNode) {
        // Fade out
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        // Stop oscillator after fade out
        setTimeout(() => {
          if (oscillator) {
            oscillator.stop();
            oscillator = null;
            isPlaying = false;
          }
        }, 600);
      }
    }, toneDuration);
  }
  
  // Toggle audio feedback on/off
  function toggleAudioFeedback() {
    audioFeedbackEnabled = !audioFeedbackEnabled;
    
    // Announce status change to screen readers
    if (window.announcer) {
      window.announcer.announce(
        audioFeedbackEnabled ? 
        "Auditory feedback enabled. Use arrow keys to navigate and hear artist density." : 
        "Auditory feedback disabled."
      );
    }
    
    if (audioFeedbackEnabled) {
      // Play initial tone based on current view
      lastInteractionWasKeyboard = true; // Force keyboard mode for initial tone
      updateFeedback();
    } else if (gainNode) {
      // Fade out the tone
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      
      // Clear any scheduled stop
      if (toneTimeout) {
        clearTimeout(toneTimeout);
        toneTimeout = null;
      }
    }
  }
  
  // Update the tone based on artist density
  function updateTone(density) {
    if (!audioContext || !audioFeedbackEnabled) return;
    
    // Skip if keyboard only and last interaction was not keyboard
    if (keyboardNavigationOnly && !lastInteractionWasKeyboard) return;
    
    // Map density to frequency (pitch)
    // Low density: 220Hz (low A), High density: 880Hz (high A)
    const minFreq = 220;
    const maxFreq = 880;
    const frequency = minFreq + (density * (maxFreq - minFreq));
    
    // Create or restart the tone if it's not playing
    if (!isPlaying) {
      setupTone();
    } else {
      // Extend the duration by rescheduling the stop
      scheduleToneStop();
    }
    
    // Smoothly change frequency
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency, 
      audioContext.currentTime + 0.2
    );
    
    // Fade in if needed
    if (gainNode.gain.value < 0.1) {
      gainNode.gain.exponentialRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
    }
  }
  
  // Update auditory feedback based on current map view
  function updateFeedback() {
    // Check if feedback is enabled
    if (!audioFeedbackEnabled) return;
    
    // Skip if keyboard only and last interaction was not keyboard
    if (keyboardNavigationOnly && !lastInteractionWasKeyboard) return;
    
    // Get the current data from the keyboard mode
    const countries = getCurrentlyVisibleCountries();
    if (!countries || countries.length === 0) return;
    
    let totalArtists = 0;
    
    // Handle different data formats
    if (Array.isArray(countries) && typeof countries[0] === 'object' && 'artistCount' in countries[0]) {
      // Format: [{name: "Country", artistCount: 5}, ...]
      totalArtists = countries.reduce((sum, country) => sum + country.artistCount, 0);
    } else if (Array.isArray(countries) && typeof countries[0] === 'object' && 'number' in countries[0]) {
      // Format: [{name: "Country", number: "A", artistCount: 5}, ...]
      totalArtists = countries.reduce((sum, country) => sum + country.artistCount, 0);
    } else {
      // Try to get artist counts from the script data
      const data = window.script && window.script.getCurrentData ? window.script.getCurrentData() : {};
      const userName = window.location.href.split("username=")[1];
      
      countries.forEach(countryId => {
        if (data[countryId] && data[countryId][userName]) {
          totalArtists += data[countryId][userName].length;
        }
      });
    }
    
    const avgDensity = countries.length > 0 ? totalArtists / countries.length : 0;
    
    // Normalize density to 0-1 range
    const maxPossibleAvg = 100; // Adjust based on your data
    const normalizedDensity = Math.min(avgDensity / maxPossibleAvg, 1);
    
    // Update the tone
    updateTone(normalizedDensity);
  }
  
  // Use the existing function from keyboard-mode.js to get visible countries
  function getCurrentlyVisibleCountries() {
    // Try to access it through the keyboardMode object
    if (window.keyboardMode && typeof window.keyboardMode.getCurrentlyVisibleCountries === 'function') {
      return window.keyboardMode.getCurrentlyVisibleCountries();
    }
    
    // If we can't find the function, return an empty array
    console.warn('Could not find getCurrentlyVisibleCountries function');
    return [];
  }
  
  // Clean up resources when the page is unloaded
  window.addEventListener('beforeunload', function() {
    if (oscillator) {
      oscillator.stop();
      oscillator = null;
    }
    
    if (toneTimeout) {
      clearTimeout(toneTimeout);
      toneTimeout = null;
    }
  });
  
  // Public API
  return {
    init: init,
    updateFeedback: updateFeedback,
    toggleAudioFeedback: toggleAudioFeedback,
    isEnabled: function() { return audioFeedbackEnabled; },
    setKeyboardOnly: function(value) { 
      keyboardNavigationOnly = value; 
    },
    setToneDuration: function(duration) { 
      toneDuration = duration; 
    }
  };
})();

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  auditoryFeedback.init();
}); 