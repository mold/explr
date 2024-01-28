var announcer = {};

/* Inspired by https://github.com/AlmeroSteyn/react-aria-live */
const LIVEREGION_TIMEOUT_DELAY = 7000;

let liveAnnouncer = null;

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Announces the message using screen reader technology.
 */
function announce(message, assertiveness = 'assertive', timeout = LIVEREGION_TIMEOUT_DELAY) {
  if (!liveAnnouncer) {
    liveAnnouncer = new LiveAnnouncer();
  }

  liveAnnouncer.announce(message, assertiveness, timeout);
}

/**
 * Stops all queued announcements.
 */
function clearAnnouncer(assertiveness) {
  if (liveAnnouncer) {
    liveAnnouncer.clear(assertiveness);
  }
}

/**
 * Removes the announcer from the DOM.
 */
function destroyAnnouncer() {
  if (liveAnnouncer) {
    liveAnnouncer.destroy();
    liveAnnouncer = null;
  }
}

class LiveAnnouncer {
  constructor() {
    this.node = document.createElement('div');
    this.node.dataset.liveAnnouncer = 'true';
    // copied from VisuallyHidden
    Object.assign(this.node.style, {
      border: 0,
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      height: '1px',
      margin: '-1px',
      overflow: 'hidden',
      padding: 0,
      position: 'absolute',
      width: '1px',
      whiteSpace: 'nowrap'
    });

    this.assertiveLog = this.createLog('assertive');
    this.node.appendChild(this.assertiveLog);

    this.politeLog = this.createLog('polite');
    this.node.appendChild(this.politeLog);

    document.body.prepend(this.node);
  }

  createLog(ariaLive) {
    let node = document.createElement('div');
    node.setAttribute('role', 'log');
    node.setAttribute('aria-live', ariaLive);
    node.setAttribute('aria-relevant', 'additions');
    return node;
  }

  destroy() {
    if (!this.node) {
      return;
    }

    document.body.removeChild(this.node);
    this.node = null;
  }

  announce(message, assertiveness = 'assertive', timeout = LIVEREGION_TIMEOUT_DELAY) {
    if (!this.node) {
      return;
    }

    let node = document.createElement('div');
    node.textContent = message;

    if (assertiveness === 'assertive') {
      this.assertiveLog.appendChild(node);
    } else {
      this.politeLog.appendChild(node);
    }

    if (message !== '') {
      setTimeout(() => {
        node.remove();
      }, timeout);
    }
  }

  clear(assertiveness) {
    if (!this.node) {
      return;
    }

    if (!assertiveness || assertiveness === 'assertive') {
      this.assertiveLog.innerHTML = '';
    }

    if (!assertiveness || assertiveness === 'polite') {
      this.politeLog.innerHTML = '';
    }
  }
}

announcer.announce = announce;
announcer.clearAnnouncer = clearAnnouncer;
announcer.destroyAnnouncer = destroyAnnouncer;
announcer.debounce = debounce;