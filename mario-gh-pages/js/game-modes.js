(function() {
  'use strict';

  var STORAGE_KEY = 'recreo-pixelado-modo';
  var body = document.body;
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-modo]'));
  var touchControls = document.getElementById('touch-controls');
  var touchButtons = Array.prototype.slice.call(document.querySelectorAll('[data-game-key]'));
  var helpText = document.getElementById('modo-ayuda');
  var activePointers = {};
  var currentMode = 'netbook';

  var HELP = {
    netbook: 'En Netbook usás el teclado: A/D para moverte, W para saltar, S para agacharte, E para el martillo y M para el mate.',
    celular: 'En Celular usás los botones táctiles: mantené ◀ ▶ para moverte, ▼ para agacharte, y tocá SALTO, MARTILLO y MATE.'
  };

  function readSavedMode() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'netbook' || saved === 'celular') return saved;
    } catch (error) {}
    return null;
  }

  function saveMode(mode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {}
  }

  function prefersTouch() {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    return (navigator.maxTouchPoints || 0) > 0;
  }

  function buttonForKey(key) {
    return touchButtons.filter(function(button) {
      return button.getAttribute('data-game-key') === key;
    });
  }

  function clearButtonState() {
    touchButtons.forEach(function(button) {
      button.classList.remove('active');
    });
  }

  function clearVisualState() {
    activePointers = {};
    clearButtonState();
  }

  function releaseAll() {
    clearVisualState();
    if (window.input && window.input.reset) window.input.reset();
  }

  function setMode(mode, persist) {
    currentMode = mode === 'celular' ? 'celular' : 'netbook';
    body.classList.toggle('modo-celular', currentMode === 'celular');
    body.classList.toggle('modo-netbook', currentMode === 'netbook');
    body.setAttribute('data-modo', currentMode);

    modeButtons.forEach(function(button) {
      var pressed = button.getAttribute('data-modo') === currentMode;
      button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    });

    if (helpText) helpText.textContent = HELP[currentMode];
    if (touchControls) touchControls.setAttribute('aria-hidden', currentMode === 'celular' ? 'false' : 'true');

    releaseAll();
    if (persist) saveMode(currentMode);
  }

  function pressButton(button, pointerId) {
    var key = button.getAttribute('data-game-key');
    if (!key || !window.input || !window.input.setVirtualKey) return;

    if (activePointers[pointerId]) {
      releasePointer(pointerId);
    }

    activePointers[pointerId] = key;
    button.classList.add('active');
    if (window.input.clearVirtualKey) {
      if (key === 'LEFT') window.input.clearVirtualKey('RIGHT');
      else if (key === 'RIGHT') window.input.clearVirtualKey('LEFT');
    }
    window.input.setVirtualKey(key, true);
  }

  function releasePointer(pointerId) {
    var key = activePointers[pointerId];
    if (!key) return;

    delete activePointers[pointerId];

    var stillHeld = Object.keys(activePointers).some(function(id) {
      return activePointers[id] === key;
    });

    if (!stillHeld && window.input && window.input.setVirtualKey) {
      window.input.setVirtualKey(key, false);
      buttonForKey(key).forEach(function(button) {
        button.classList.remove('active');
      });
    }
  }

  modeButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      setMode(button.getAttribute('data-modo'), true);
    });
  });

  touchButtons.forEach(function(button) {
    button.addEventListener('pointerdown', function(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        button.setPointerCapture(event.pointerId);
      } catch (error) {}
      pressButton(button, event.pointerId);
    });

    button.addEventListener('pointerup', function(event) {
      releasePointer(event.pointerId);
    });

    button.addEventListener('pointercancel', function(event) {
      releasePointer(event.pointerId);
    });

    button.addEventListener('lostpointercapture', function(event) {
      releasePointer(event.pointerId);
    });

    button.addEventListener('contextmenu', function(event) {
      event.preventDefault();
    });
  });

  window.addEventListener('pointerup', function(event) {
    releasePointer(event.pointerId);
  });

  window.addEventListener('pointercancel', function(event) {
    releasePointer(event.pointerId);
  });

  window.addEventListener('blur', releaseAll);
  window.addEventListener('orientationchange', releaseAll);
  document.addEventListener('input:reset', clearVisualState);
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) releaseAll();
  });

  var initialMode = readSavedMode() || (prefersTouch() ? 'celular' : 'netbook');
  setMode(initialMode, false);
})();
