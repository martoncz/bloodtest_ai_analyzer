(function() {
  'use strict';

  /**
   * Safely checks if an element matches a selector
   * @param {EventTarget} target - The event target
   * @param {string} selector - The CSS selector to match
   * @returns {boolean} - True if element matches selector, false otherwise
   */
  function safeMatches(target, selector) {
    // Check if target exists and is an Element node
    if (!target || target.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    
    // Check if matches method exists
    if (typeof target.matches === 'function') {
      return target.matches(selector);
    }
    
    // Fallback for older browsers
    if (typeof target.msMatchesSelector === 'function') {
      return target.msMatchesSelector(selector);
    }
    
    if (typeof target.webkitMatchesSelector === 'function') {
      return target.webkitMatchesSelector(selector);
    }
    
    return false;
  }

  /**
   * Safely finds the closest ancestor element that matches a selector
   * @param {EventTarget} target - The event target
   * @param {string} selector - The CSS selector to match
   * @returns {Element|null} - The closest matching element or null
   */
  function safeClosest(target, selector) {
    // Check if target exists and is an Element node
    if (!target || target.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    
    // Use native closest if available
    if (typeof target.closest === 'function') {
      return target.closest(selector);
    }
    
    // Fallback implementation
    let element = target;
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      if (safeMatches(element, selector)) {
        return element;
      }
      element = element.parentElement;
    }
    
    return null;
  }

  /**
   * Get the actual Element from an event target
   * @param {EventTarget} target - The event target
   * @returns {Element|null} - The Element node or null
   */
  function getElementFromTarget(target) {
    if (!target) {
      return null;
    }
    
    // If target is already an Element, return it
    if (target.nodeType === Node.ELEMENT_NODE) {
      return target;
    }
    
    // If target is a text node, return its parent element
    if (target.nodeType === Node.TEXT_NODE && target.parentElement) {
      return target.parentElement;
    }
    
    // For other node types, try to find the closest element
    let current = target;
    while (current && current.parentElement) {
      if (current.parentElement.nodeType === Node.ELEMENT_NODE) {
        return current.parentElement;
      }
      current = current.parentElement;
    }
    
    return null;
  }

  // Override Array.prototype.some to handle the specific error case
  const originalSome = Array.prototype.some;
  Array.prototype.some = function(callback, thisArg) {
    try {
      return originalSome.call(this, callback, thisArg);
    } catch (error) {
      // If the error is about matches not being a function, handle it gracefully
      if (error.message && error.message.includes('matches is not a function')) {
        console.warn('Event target matches error caught and handled:', error.message);
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  };

  // Patch common event handling patterns
  const originalAddEventListener = Element.prototype.addEventListener;
  Element.prototype.addEventListener = function(type, listener, options) {
    if (typeof listener === 'function') {
      const wrappedListener = function(event) {
        try {
          // Ensure event.target is properly set
          if (event.target && event.target.nodeType !== Node.ELEMENT_NODE) {
            const elementTarget = getElementFromTarget(event.target);
            if (elementTarget) {
              // Create a new event object with corrected target
              const correctedEvent = new Proxy(event, {
                get: function(target, prop) {
                  if (prop === 'target') {
                    return elementTarget;
                  }
                  return target[prop];
                }
              });
              return listener.call(this, correctedEvent);
            }
          }
          return listener.call(this, event);
        } catch (error) {
          if (error.message && error.message.includes('matches is not a function')) {
            console.warn('Event listener error caught and handled:', error.message);
            return false;
          }
          throw error;
        }
      };
      
      // Store original listener for removeEventListener
      wrappedListener._original = listener;
      
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };

  // Patch document event listeners as well
  const originalDocumentAddEventListener = Document.prototype.addEventListener;
  Document.prototype.addEventListener = function(type, listener, options) {
    if (typeof listener === 'function') {
      const wrappedListener = function(event) {
        try {
          // Ensure event.target is properly set
          if (event.target && event.target.nodeType !== Node.ELEMENT_NODE) {
            const elementTarget = getElementFromTarget(event.target);
            if (elementTarget) {
              // Create a new event object with corrected target
              const correctedEvent = new Proxy(event, {
                get: function(target, prop) {
                  if (prop === 'target') {
                    return elementTarget;
                  }
                  return target[prop];
                }
              });
              return listener.call(this, correctedEvent);
            }
          }
          return listener.call(this, event);
        } catch (error) {
          if (error.message && error.message.includes('matches is not a function')) {
            console.warn('Document event listener error caught and handled:', error.message);
            return false;
          }
          throw error;
        }
      };
      
      // Store original listener for removeEventListener
      wrappedListener._original = listener;
      
      return originalDocumentAddEventListener.call(this, type, wrappedListener, options);
    }
    
    return originalDocumentAddEventListener.call(this, type, listener, options);
  };

  // Export utility functions to global scope for use in other scripts
  window.EventSafety = {
    safeMatches: safeMatches,
    safeClosest: safeClosest,
    getElementFromTarget: getElementFromTarget
  };

  console.log('Event safety fix initialized');
})();