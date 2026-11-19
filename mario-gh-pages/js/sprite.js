(function() {
  if (typeof Mario === 'undefined')
    window.Mario = {};

  var Sprite = Mario.Sprite = function(img, pos, size, speed, frames, once) {
    this.pos = pos;
    this.size = size;
    this.speed = speed;
    this._index = 0;
    this.img = img;
		this.once = once;
		this.frames = frames;
	}

  Sprite.prototype.update = function(dt, gameTime) {
    if (gameTime && gameTime == this.lastUpdated) return;
    if (this.speed > 0 && !this.done) {
      this._index += this.speed*dt;
      if (this.once && this._index >= this.frames.length) {
        this._index = this.frames.length - 1;
        this.done = true;
      }
    }
    if (gameTime) this.lastUpdated = gameTime;
  }

  Sprite.prototype.setFrame = function(frame) {
    this._index = frame;
    this.done = false;
  }

  Sprite.prototype.play = function(animation) {
    if (!this.animations || !this.animations[animation]) return;
    var data = this.animations[animation];
    if (this.animationName === animation) {
      // El tamaño puede cambiar sin cambiar de animación (por ejemplo, al
      // salir por la bandera). Recalculamos la escala para no deformar el frame.
      this.frameScale = data.scaleH && this.size[1] ? this.size[1] / data.scaleH : null;
      return;
    }
    this.animationName = animation;
    this.speed = data.fps;
    this.once = !data.loop;
    this._index = 0;
    this.done = false;
    if (data.images) {
      this.frameImages = data.images;
      this.frames = data.images.map(function(_, i) { return i; });
      this.frameRects = null;
    } else {
      this.frameImages = null;
      this.frames = data.frames;
      this.frameRects = data.rects;
    }
    // Escala física de la animación: el frame más alto mide this.size[1],
    // y los demás frames se dibujan proporcionales a esa escala.
    this.frameScale = data.scaleH && this.size[1] ? this.size[1] / data.scaleH : null;
  }

  Sprite.prototype.render = function(ctx, posx, posy, vX, vY) {
    var frame;

    if (this.speed > 0) {
      var max = this.frames.length;
      var idx = Math.floor(this._index);
      frame = this.frames[idx % max];

      if (this.once && idx >= max) {
        this.done = true;
        return;
      }
    } else {
      frame = 0;
    }

    var x = this.pos[0];
    var y = this.pos[1];
    var activeImage = this.img;
    var activeRects = this.frameRects;
    var useFrameImages = !!(this.frameImages && this.frameImages[frame]);
    if (useFrameImages) {
      activeImage = this.frameImages[frame];
      activeRects = null;
    }
    if (this.alternateImg && posx >= this.phaseX) {
      activeImage = this.alternateImg;
      activeRects = this.alternateFrameRects || this.frameRects;
    }
    var sourceWidth = this.size[0];
    var sourceHeight = this.size[1];
    if (activeRects && activeRects[frame]) {
      x = activeRects[frame][0];
      y = activeRects[frame][1];
      sourceWidth = activeRects[frame][2];
      sourceHeight = activeRects[frame][3];
    } else if (useFrameImages) {
      var fi = resources.get(activeImage);
      if (fi) { sourceWidth = fi.width; sourceHeight = fi.height; }
      x = 0;
      y = 0;
    } else {
      x += frame*this.size[0];
    }
    var drawX = Math.round(posx - vX) + ((this.renderOffset && this.renderOffset[0]) || 0);
    var drawY = Math.round(posy - vY) + ((this.renderOffset && this.renderOffset[1]) || 0);
    var drawW = this.size[0];
    var drawH = this.size[1];
    // Los sprites con frames de alta resolución se escalan a su tamaño real
    // (proporción preservada), anclados abajo y centrados.
    if (this.frameScale && (useFrameImages || (activeRects && activeRects[frame]))) {
      drawH = Math.max(1, Math.round(sourceHeight * this.frameScale));
      drawW = Math.max(1, Math.round(sourceWidth * this.frameScale));
      drawX += Math.round((this.size[0] - drawW) / 2);
      drawY += (this.size[1] - drawH);
    }
    ctx.save();
		var image = resources.get(activeImage);
		if (this.flipX) {
      ctx.translate(drawX + drawW, drawY);
      ctx.scale(-1, 1);
			ctx.drawImage(image, x, y, sourceWidth, sourceHeight, 0, 0, drawW, drawH);
		} else {
			ctx.drawImage(image, x, y, sourceWidth, sourceHeight, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }
})();
