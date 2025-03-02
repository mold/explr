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
  
  // Initialize Web Audio API
  function init() {
    try {
      // Create audio context with user interaction to avoid autoplay restrictions
      document.addEventListener('click', function initAudioContext() {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log("Audio context initialized on user interaction");
        }
        document.removeEventListener('click', initAudioContext);
      }, { once: true });
      
      // Add keyboard shortcut for toggling audio feedback
      document.addEventListener('keydown', function(e) {
        // Toggle audio feedback with 'A' key
        if (e.key.toLowerCase() === 'a' && !e.repeat) {
          toggleAudioFeedback();
        }
        
        // Play feedback on arrow key navigation
        if (keyboardNavigationOnly && audioFeedbackEnabled && 
            (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
             e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          // Small delay to allow the map to update first
          setTimeout(updateFeedback, 100);
        }
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
      updateFeedback();
    }
  }
  
  // Play a tone based on artist density
  function playDensityTone(density, duration = 300) {
    if (!audioContext) return;
    
    // Stop any currently playing tone
    if (oscillator) {
      oscillator.stop();
      oscillator = null;
    }
    
    // Create new audio nodes
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    // Map density to frequency (pitch)
    // Low density: 220Hz (low A), High density: 880Hz (high A)
    const minFreq = 220;
    const maxFreq = 880;
    const frequency = minFreq + (density * (maxFreq - minFreq));
    
    // Configure oscillator
    oscillator.type = 'sine'; // Sine wave is less harsh
    oscillator.frequency.value = frequency;
    
    // Configure gain (volume)
    gainNode.gain.value = 0.1; // Keep volume low to be subtle
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play tone with fade out
    oscillator.start();
    console.log("Playing tone with frequency: " + frequency);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration/1000);
    
    // Stop after duration
    setTimeout(() => {
      if (oscillator) {
        oscillator.stop();
        oscillator = null;
      }
    }, duration);
  }
  
  // Update auditory feedback based on current map view
  function updateFeedback() {
    // Check if feedback is enabled
    if (!audioFeedbackEnabled) return;
    
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
    
    // Play tone
    playDensityTone(normalizedDensity);
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
  
  // Public API
  return {
    init: init,
    updateFeedback: updateFeedback,
    toggleAudioFeedback: toggleAudioFeedback,
    isEnabled: function() { return audioFeedbackEnabled; },
    setKeyboardOnly: function(value) { keyboardNavigationOnly = value; }
  };
})();

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  auditoryFeedback.init();
}); 