(function() {
  if (typeof Mario === 'undefined')
    window.Mario = {};

  //TODO: clean up the logic for sprite switching.
  //TODO: There's a weird bug with the collision logic. Look into it.

  var Block = Mario.Block = function(options) {
    this.item = options.item;
    this.usedSprite = options.usedSprite;
    this.bounceSprite = options.bounceSprite;
    this.breakable = options.breakable;

    Mario.Entity.call(this, {
      pos: options.pos,
      sprite: options.sprite,
      hitbox: [0,0,16,16]
    });

    this.standing = true;
  }

  Mario.Util.inherits(Block, Mario.Floor);

	Block.prototype.break = function() {
		sounds.breakBlock.play();
		(new Mario.Rubble()).spawn(this.pos);

		// Un bloque golpeado desde abajo queda rebotando y su pos pasa a tener
		// decimales. Si el martillo lo rompe en ese momento, calcular la fila
		// con la pos actual daba una fila inexistente y rompía el juego.
		// Usamos la posición original del rebote y, si no coincide, buscamos
		// el bloque por identidad en la grilla.
		var origin = this.opos || this.pos;
		var x = Math.round(origin[0] / 16);
		var y = Math.round(origin[1] / 16);
		var row = level.blocks[y];
		if (row && row[x] === this) {
			delete row[x];
			return;
		}
		for (var r = 0; r < level.blocks.length; r++) {
			var candidate = level.blocks[r];
			if (candidate && candidate[x] === this) {
				delete candidate[x];
				return;
			}
		}
	}

	Block.prototype.hammerBreak = function() {
		if (!this.breakable) return;
		var dropPos = this.pos.slice();
		this.break();
		// Solo el martillo puede hacer aparecer material para el mate.
		if (Mario.rollMateDrop && Mario.dropMate && Mario.rollMateDrop()) {
			Mario.dropMate(dropPos);
		}
	}

	Block.prototype.bonk = function(power) {
    sounds.bump.play();
    if (power > 0 && this.breakable) {
      this.break();
    } else if (this.standing){
      this.standing = false;
      if (this.item) {
        this.item.spawn();
        this.item = null;
      }
      this.opos = [];
      this.opos[0] = this.pos[0];
      this.opos[1] = this.pos[1];
      if (this.bounceSprite) {
        this.osprite = this.sprite;
        this.sprite = this.bounceSprite;
      } else {
        this.sprite = this.usedSprite;
      }

      this.vel[1] = -2;
    }
  }

  Block.prototype.update = function(dt, gameTime) {
    if (!this.standing) {
      if (this.pos[1] < this.opos[1] - 8) {
        this.vel[1] = 2;
      }
      if (this.pos[1] > this.opos[1]) {
        this.vel[1] = 0;
        this.pos = this.opos;
        if (this.osprite) {
          this.sprite = this.osprite;
        }
        this.standing = true;
      }
    } else {
      if (this.sprite === this.usedSprite) {
        // Misma precaución: redondeamos por si el bloque quedó con decimales.
        var x = Math.round(this.pos[0] / 16), y = Math.round(this.pos[1] / 16);
        if (level.statics[y] && level.blocks[y] && level.blocks[y][x] === this) {
          level.statics[y][x] = new Mario.Floor(this.pos, this.usedSprite);
          delete level.blocks[y][x];
        }
      }
    }

    this.pos[1] += this.vel[1];
    this.sprite.update(dt, gameTime);
  }

})();
