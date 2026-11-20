(function() {
  if (typeof Mario === 'undefined')
  window.Mario = {};

  //TODO: On console the hitbox is smaller. Measure it and edit this.

  var Goomba = Mario.Goomba = function(pos, sprite) {
    this.dying = false;
    Mario.Entity.call(this, {
      pos: pos,
      sprite: sprite,
      hitbox: [0,0,16,16]
    });
		this.vel[0] = -0.5;
		this.specialTimer = 1.5 + Math.random() * 2.5;
		this.hopping = false;
		this.idx = level.enemies.length;

		// Ocurrencias goofy: se activan de vez en cuando y duran poco.
		this.goofy = null;
		this.goofyTimer = 1 + Math.random() * 2.5;
		this.goofyTime = 0;
		this.goofyDuration = 0;
		this.goofyVel = 0;
		this.goofySpin = 0;
		this.bubble = '';
		this.bubbleLift = 0;
  };

  var GOOFY_ACTS = ['wiggle', 'nap', 'dash', 'spin', 'backstep'];

  Goomba.prototype.render = function(ctx, vX, vY) {
    Mario.Goofy.drawSprite(ctx, this.sprite, this, vX, vY, this.goofySpin);
    Mario.Goofy.drawBubble(ctx, this, vX, vY);
  };

  Goomba.prototype.startGoofy = function() {
    if (this.dying || this.flipping) return;
    var act = Mario.Goofy.pick(GOOFY_ACTS);
    this.goofy = act;
    this.goofyTime = 0;
    this.goofyDuration = act === 'nap' ? 1.3 + Math.random() * 0.8
      : act === 'dash' ? 0.6 + Math.random() * 0.3
      : 0.8 + Math.random() * 0.5;
    this.goofyVel = this.vel[0];
    if (act === 'nap') {
      this.vel[0] = 0;
      this.bubble = 'Zzz';
    } else if (act === 'dash') {
      this.vel[0] = (this.goofyVel < 0 ? -1 : 1) * 1.7;
      this.bubble = '¡¡';
    } else if (act === 'spin') {
      this.vel[0] = this.goofyVel * 0.2;
      this.bubble = '★';
    } else if (act === 'backstep') {
      this.vel[0] = -this.goofyVel * 0.9;
      this.bubble = '¿?';
    } else {
      this.bubble = '~';
    }
  };

  Goomba.prototype.updateGoofy = function(dt) {
    if (this.dying || this.flipping) {
      this.goofy = null;
      this.goofySpin = 0;
      this.bubble = '';
      this.bubbleLift = 0;
      return;
    }
    if (!this.goofy) {
      this.goofyTimer -= dt;
      if (this.goofyTimer <= 0) this.startGoofy();
      return;
    }

    this.goofyTime += dt;
    var p = Math.min(1, this.goofyTime / this.goofyDuration);
    this.bubbleLift = Math.sin(p * Math.PI) * 3;
    if (this.goofy === 'wiggle') {
      var wave = Math.sin(p * Math.PI * 6);
      this.vel[0] = this.goofyVel * (1 + wave * 0.9);
      this.goofySpin = wave * 0.22;
    } else if (this.goofy === 'spin') {
      this.goofySpin = p * Math.PI * 4;
    }

    if (p >= 1) {
      this.vel[0] = this.goofyVel;
      this.goofy = null;
      this.goofySpin = 0;
      this.bubble = '';
      this.bubbleLift = 0;
      this.goofyTimer = 2 + Math.random() * 3.5;
    }
  };

  Goomba.prototype.update = function(dt, vX) {
    if (this.pos[0] - vX > 336) { //if we're too far away, do nothing.
      return;
    } else if (this.pos[0] - vX < -32) {
      delete level.enemies[this.idx];
    }

    this.updateGoofy(dt);

    if (this.dying) {
      this.dying -= 1;
      if (!this.dying) {
        delete level.enemies[this.idx];
      }
    }
		this.specialTimer -= dt;
		if (!this.dying && this.specialTimer <= 0 && Math.abs(this.vel[1]) < 0.05 && this.pos[1] % 16 < 0.1) {
			this.vel[1] = -3.2;
			this.hopping = true;
			this.specialTimer = 2 + Math.random() * 3;
		}
		this.acc[1] = 0.2;
    this.vel[1] += this.acc[1];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    this.sprite.update(dt);
  };

  Goomba.prototype.collideWall = function() {
    this.vel[0] = -this.vel[0];
    if (this.goofy) this.goofyVel = -this.goofyVel;
  };

  Goomba.prototype.checkCollisions = function() {
    if (this.flipping) {
      return;
    }

    var h = this.pos[1] % 16 === 0 ? 1 : 2;
    var w = this.pos[0] % 16 === 0 ? 1 : 2;

    var baseX = Math.floor(this.pos[0] / 16);
    var baseY = Math.floor(this.pos[1] / 16);

    if (baseY + h > 15) {
      delete level.enemies[this.idx];
      return;
    }

    for (var i = 0; i < h; i++) {
      for (var j = 0; j < w; j++) {
        if (level.statics[baseY + i][baseX + j]) {
          level.statics[baseY + i][baseX + j].isCollideWith(this);
        }
        if (level.blocks[baseY + i][baseX + j]) {
          level.blocks[baseY + i][baseX + j].isCollideWith(this);
        }
      }
    }
    var that = this;
    level.enemies.forEach(function(enemy){
      if (enemy === that) { //don't check collisions with ourselves.
        return;
      } else if (enemy.pos[0] - vX > 336){ //stop checking once we get to far away dudes.
        return;
      } else {
        that.isCollideWith(enemy);
      }
    });
    this.isCollideWith(player);
  };

  Goomba.prototype.isCollideWith = function(ent) {
    if (ent instanceof Mario.Player && (this.dying || ent.invincibility)) {
      return;
    }

    //the first two elements of the hitbox array are an offset, so let's do this now.
    var hpos1 = [this.pos[0] + this.hitbox[0], this.pos[1] + this.hitbox[1]];
    var hpos2 = [ent.pos[0] + ent.hitbox[0], ent.pos[1] + ent.hitbox[1]];

    //if the hitboxes actually overlap
    if (!(hpos1[0] > hpos2[0]+ent.hitbox[2] || (hpos1[0]+this.hitbox[2] < hpos2[0]))) {
      if (!(hpos1[1] > hpos2[1]+ent.hitbox[3] || (hpos1[1]+this.hitbox[3] < hpos2[1]))) {
        if (ent instanceof Mario.Player) { //if we hit the player
          if (ent.vel[1] > 0) { //then the goomba dies
            this.stomp();
          } else if (ent.starTime) {
            this.bump();
          } else { //or the player gets hit
            ent.damage();
          }
        } else {
          this.collideWall();
        }
      }
    }
  };

  Goomba.prototype.stomp = function() {
    sounds.stomp.play();
    player.bounce = true;
    this.sprite.pos[0] = 32;
    this.sprite.speed = 0;
    this.vel[0] = 0;
    this.dying = 10;
    if (Mario.registerKill) Mario.registerKill(this);
  };

  Goomba.prototype.bump = function() {
    sounds.kick.play();
    this.sprite.img = 'sprites/enemyr.png';
    this.flipping = true;
    this.pos[1] -= 1;
    this.vel[0] = 0;
    this.vel[1] = -2.5;
    if (Mario.registerKill) Mario.registerKill(this);
  };
})();
