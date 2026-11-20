(function() {
    var pressedKeys = {};   // teclado y mouse
    var virtualKeys = {};   // botones táctiles
    // Los toques rápidos pueden terminar antes de que corra un frame: se mantiene
    // la tecla virtual unos milisegundos para que el juego la alcance a leer.
    var virtualReleaseTimers = {};

    function setKey(event, status) {
	        var code = event.keyCode;
	        var keyName = (event.key || '').toLowerCase();
	        var key;

	        if (keyName === 'w') key = 'JUMP';
	        else if (keyName === 'a') key = 'LEFT';
	        else if (keyName === 's') key = 'DOWN';
	        else if (keyName === 'd') key = 'RIGHT';
        else if (keyName === 'e' || code === 69) key = 'ATTACK';
	        else switch(code) {
	        case 32:
	            key = 'SPACE'; break;
        case 37:
            key = 'LEFT'; break;
        case 38:
            key = 'UP'; break;
        case 39:
            key = 'RIGHT'; break;
        case 40:
            key = 'DOWN'; break;
        case 88:
            key = 'JUMP'; break;
        default:
	            key = String.fromCharCode(code);
	        }

	        pressedKeys[key] = status;
        if (['JUMP','LEFT','RIGHT','DOWN','ATTACK'].indexOf(key) !== -1) event.preventDefault();
	    }

    document.addEventListener('keydown', function(e) {
        setKey(e, true);
    });

    document.addEventListener('keyup', function(e) {
        setKey(e, false);
    });

    document.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        // En pantallas táctiles el martillo se usa con el botón dedicado.
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
        var target = e.target;
        if (!target || !target.closest) return;
        // Los botones del sitio y los controles táctiles no deben atacar.
        if (target.closest('button, a, input, select, textarea, .touch-controls, .modo-selector')) return;
        if (!target.closest('#game-screen')) return;
        pressedKeys.ATTACK = true;
        e.preventDefault();
    });

    document.addEventListener('mouseup', function(e) {
        if (e.button === 0) pressedKeys.ATTACK = false;
    });

    window.addEventListener('blur', function() {
        if (window.input && window.input.reset) window.input.reset();
    });
    window.input = {
        isDown: function(key) {
            var name = key.toUpperCase();
            return !!(pressedKeys[name] || virtualKeys[name]);
        },
        consumeKey: function(key) {
            var name = key.toUpperCase();
            var wasDown = !!(pressedKeys[name] || virtualKeys[name]);
            if (!wasDown) return false;
            pressedKeys[name] = false;
            virtualKeys[name] = false;
            if (virtualReleaseTimers[name]) {
                clearTimeout(virtualReleaseTimers[name]);
                virtualReleaseTimers[name] = null;
            }
            return true;
        },
        consumeAttack: function() {
          var wasDown = !!(pressedKeys.ATTACK || virtualKeys.ATTACK);
          if (!wasDown) return false;
          pressedKeys.ATTACK = false;
          virtualKeys.ATTACK = false;
          if (virtualReleaseTimers.ATTACK) {
            clearTimeout(virtualReleaseTimers.ATTACK);
            virtualReleaseTimers.ATTACK = null;
          }
          return true;
        },
        // Permite que los botones táctiles actúen como teclas del juego.
        setVirtualKey: function(key, status) {
          var name = key.toUpperCase();
          if (status) {
            if (virtualReleaseTimers[name]) {
              clearTimeout(virtualReleaseTimers[name]);
              virtualReleaseTimers[name] = null;
            }
            virtualKeys[name] = true;
          } else {
            // Mantiene la tecla unos milisegundos para que un toque corto alcance
            // a registrarse aunque pointerup se dispare antes del siguiente frame.
            if (virtualReleaseTimers[name]) clearTimeout(virtualReleaseTimers[name]);
            virtualReleaseTimers[name] = setTimeout(function() {
              virtualKeys[name] = false;
              virtualReleaseTimers[name] = null;
            }, 50);
          }
        },
        // Cancela al instante una tecla virtual (usado al cambiar de dirección).
        clearVirtualKey: function(key) {
          var name = key.toUpperCase();
          if (virtualReleaseTimers[name]) {
            clearTimeout(virtualReleaseTimers[name]);
            virtualReleaseTimers[name] = null;
          }
          virtualKeys[name] = false;
        },
        reset: function() {
          Object.keys(virtualReleaseTimers).forEach(function(name) {
            clearTimeout(virtualReleaseTimers[name]);
          });
          virtualReleaseTimers = {};
          pressedKeys = {};
          virtualKeys = {};
          // Avisa a los controles táctiles para que su estado visual coincida.
          if (document.createEvent) {
            var resetEvent = document.createEvent('Event');
            resetEvent.initEvent('input:reset', true, true);
            document.dispatchEvent(resetEvent);
          }
        }
    };
})();
