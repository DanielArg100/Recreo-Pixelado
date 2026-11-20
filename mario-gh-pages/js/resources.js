//simple resource loader
(function() {
    var resourceCache = {};
    var readyCallbacks = [];
    var fallbackImage = null;

    // Si falta un asset, se dibuja un marcador en vez de trabar el juego.
    function getFallbackImage() {
        if (!fallbackImage) {
            fallbackImage = document.createElement('canvas');
            fallbackImage.width = 16;
            fallbackImage.height = 16;
            fallbackImage.isFallback = true;
            var ctx = fallbackImage.getContext('2d');
            ctx.fillStyle = '#f0d36b';
            ctx.fillRect(0, 0, 16, 16);
            ctx.strokeStyle = '#1e332c';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 14, 14);
        }
        return fallbackImage;
    }

    function notifyIfReady() {
        if (isReady()) {
            readyCallbacks.forEach(function(func) { func(); });
        }
    }

    // Load an image url or an array of image urls
    function load(urlOrArr) {
        if(urlOrArr instanceof Array) {
            urlOrArr.forEach(function(url) {
                _load(url);
            });
        }
        else {
            _load(urlOrArr);
        }
    }

    function _load(url) {
        if(resourceCache[url]) {
            return resourceCache[url];
        }
        else {
            var img = new Image();
            var settled = false;
            function finish(value) {
                if (settled) return;
                settled = true;
                resourceCache[url] = value;
                notifyIfReady();
            }
            img.onload = function() { finish(img); };
            img.onerror = function() { finish(getFallbackImage()); };
            resourceCache[url] = false;
            img.src = url;
        }
    }

    function get(url) {
        return resourceCache[url];
    }

    function isReady() {
        var ready = true;
        for(var k in resourceCache) {
            if(resourceCache.hasOwnProperty(k) &&
               !resourceCache[k]) {
                ready = false;
            }
        }
        return ready;
    }

    function onReady(func) {
        readyCallbacks.push(func);
    }

    window.resources = {
        load: load,
        get: get,
        onReady: onReady,
        isReady: isReady
    };
})();
