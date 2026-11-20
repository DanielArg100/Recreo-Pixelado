(function() {
    var pressedKeys = {};

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
        if (e.button === 0) {
            pressedKeys.ATTACK = true;
            e.preventDefault();
        }
    });

    document.addEventListener('mouseup', function(e) {
        if (e.button === 0) pressedKeys.ATTACK = false;
    });

    window.addEventListener('blur', function() {
        pressedKeys = {};
    });

    window.input = {
        isDown: function(key) {
            return pressedKeys[key.toUpperCase()];
        },
        consumeKey: function(key) {
            var name = key.toUpperCase();
            if (!pressedKeys[name]) return false;
            pressedKeys[name] = false;
            return true;
        },
        consumeAttack: function() {
          if (!pressedKeys.ATTACK) return false;
          pressedKeys.ATTACK = false;
          return true;
        },
        reset: function() {
          pressedKeys['LEFT'] = false;
          pressedKeys['RIGHT'] = false;
          pressedKeys['DOWN'] = false;
          pressedKeys['JUMP'] = false;
          pressedKeys['ATTACK'] = false;
        }
    };
})();
