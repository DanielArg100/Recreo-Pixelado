(function() {
  if (typeof Mario === 'undefined')
  window.Mario = {};

  var Koopa = Mario.Koopa = function(pos, sprite, para) {
    this.dying = false;
    this.shell = false;

    this.para = para; //para. As in, is it a paratroopa?

    //So, funny story. The actual hitboxes don't reach all the way to the ground.
    //What that means is, as long as I use them to keep things on the floor
    //making the hitboxes accurate will make enemies sink into the ground.
    Mario.Entity.call(this, {
      pos: pos,
      sprite: sprite,
      hitbox: [2,8,12,24]
    });
		this.vel[0] = -0.5;
		this.chargeTimer = 2 + Math.random() * 3;
		this.idx = level.enemies.length;

		// Ocurrencias goofy: se activan de vez en cuando y duran poco.
		this.goofy = null;
		this.goofyTimer = 1.5 + Math.random() * 3;
		this.goofyTime = 0;
		this.goofyDuration = 0;
		this.goofyVel = 0;
		this.goofySpin = 0;
		this.goofyFace = null;
		this.bubble = '';
		this.bubbleLift = 0;
  };

  var GOOFY_ACTS = ['skate', 'bow', 'peek', 'backstep', 'tumble', 'hop'];

  Koopa.prototype.render = function(ctx, vX, vY) {
    Mario.Goofy.drawSprite(ctx, this.sprite, this, vX, vY, this.goofySpin);
    Mario.Goofy.drawBubble(ctx, this, vX, vY);
  };

  Koopa.prototype.startGoofy = function() {
    if (this.shell || this.flipping || this.dying) return;
    var act = Mario.Goofy.pick(GOOFY_ACTS);
    this.goofy = act;
    this.goofyTime = 0;
    this.goofyDuration = act === 'skate' ? 0.6 + Math.random() * 0.4
      : act === 'bow' ? 0.9 + Math.random() * 0.4
      : act === 'hop' ? 1.1 + Math.random() * 0.6
      : 0.7 + Math.random() * 0.5;
    this.goofyVel = this.vel[0];
    this.goofyFace = null;
    this.goofyHop = 0;
    if (act === 'skate') {
      this.vel[0] = (this.goofyVel < 0 ? -1 : 1) * 2;
      this.bubble = '¡¡';
    } else if (act === 'bow') {
      this.vel[0] = 0;
      this.bubble = '♪';
    } else if (act === 'peek') {
      this.vel[0] = this.goofyVel * 0.25;
      this.goofyFace = player && player.pos[0] < this.pos[0];
      this.bubble = '¡!';
    } else if (act === 'backstep') {
      this.vel[0] = -this.goofyVel * 0.8;
      this.bubble = '¿?';
    } else if (act === 'hop') {
      // Exclusivo del koopa: avanza lento dando saltitos repetidos.
      this.vel[0] = this.goofyVel * 0.5;
      if (this.standing) this.vel[1] = -4.5;
      this.bubble = '¡BOING!';
    } else {
      this.vel[0] = this.goofyVel * 0.3;
      this.bubble = '★';
    }
  };

  Koopa.prototype.updateGoofy = function(dt) {
    if (this.shell || this.flipping || this.dying) {
      this.goofy = null;
      this.goofySpin = 0;
      this.goofyFace = null;
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
    if (this.goofy === 'bow') {
      this.goofySpin = Math.sin(p * Math.PI) * 0.6;
    } else if (this.goofy === 'tumble') {
      this.goofySpin = p * Math.PI * 4;
    } else if (this.goofy === 'hop') {
      this.goofyHop -= dt;
      if (this.goofyHop <= 0 && this.vel[1] >= 0) {
        this.vel[1] = -4.2;
        this.goofyHop = 0.34;
      }
      this.goofySpin = Math.sin(p * Math.PI * 8) * 0.08;
    }

    if (p >= 1) {
      this.vel[0] = this.goofyVel;
      this.goofy = null;
      this.goofySpin = 0;
      this.goofyFace = null;
      this.bubble = '';
      this.bubbleLift = 0;
      this.goofyTimer = 2 + Math.random() * 3.5;
    }
  };

  Koopa.prototype.update = function(dt, vX) {
    if (this.turn) {
      this.vel[0] = -this.vel[0];
      if (this.goofy) this.goofyVel = -this.goofyVel;
      if (this.shell) sounds.bump.play();
      this.turn = false;
    }
    this.updateGoofy(dt);
		this.chargeTimer -= dt;
		if (!this.shell && !this.goofy && this.chargeTimer <= 0 && Math.abs(this.pos[0] - player.pos[0]) < 88) {
			this.vel[0] = player.pos[0] < this.pos[0] ? -1.8 : 1.8;
			this.chargeTimer = 3 + Math.random() * 2;
		}
		if (this.goofyFace !== null) {
      this.left = this.goofyFace;
    } else if (this.vel[0] != 0) {
      this.left = (this.vel[0] < 0);
    }

    if (this.left) {
      this.sprite.img = 'sprites/enemy.png';
    } else {
      this.sprite.img = 'sprites/enemyr.png';
    }

    if (this.pos[0] - vX > 336) { //if we're too far away, do nothing.
      return;
    } else if (this.pos[0] - vX < -32) {
      delete level.enemies[this.idx];
    }

    if (this.dying) {
      this.dying -= 1;
      if (!this.dying) {
        delete level.enemies[this.idx];
      }
    }

    if (this.shell) {
      if (this.vel[0] == 0) {
        this.shell -= 1;
        if (this.shell < 120) {
          this.sprite.speed = 5;
        }
        if (this.shell == 0) {
          this.sprite = level.koopaSprite();
          this.hitbox = [2,8,12,24]
          if (this.left) {
            this.sprite.img = 'sprites/enemyr.png';
            this.vel[0] = 0.5;
            this.left = false;
          } else {
            this.vel[0] = -0.5;
            this.left = true;
          }
          this.pos[1] -= 16;
        }
      } else {
        this.shell = 360;
        this.sprite.speed = 0;
        this.sprite.setFrame(0);
      }
    }
    this.acc[1] = 0.2;
    this.vel[1] += this.acc[1];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    this.sprite.update(dt);
  };

  Koopa.prototype.collideWall = function() {
    //This stops us from flipping twice on the same frame if we collide
    //with multiple wall tiles simultaneously.
    this.turn = true;
  };

  Koopa.prototype.checkCollisions = function() {
    var h = this.shell ? 1 : 2;
    if (this.pos[1] % 16 !== 0) {
      h += 1;
    }
    var w = this.pos[0] % 16 === 0 ? 1 : 2;

    var baseX = Math.floor(this.pos[0] / 16);
    var baseY = Math.floor(this.pos[1] / 16);

    if (baseY + h > 15) {
      delete level.enemies[this.idx];
      return;
    }

    if (this.flipping) {
      return;
    }

    for (var i = 0; i < h; i++) {
      var row = baseY + i;
      // El koopa puede quedar por encima del nivel al saltar: sin este
      // control, level.statics[-1] es undefined y el juego se rompe.
      if (row < 0 || row >= level.statics.length) continue;
      var staticsRow = level.statics[row];
      var blocksRow = level.blocks[row];
      for (var j = 0; j < w; j++) {
        if (staticsRow && staticsRow[baseX + j]) {
          staticsRow[baseX + j].isCollideWith(this);
        }
        if (blocksRow && blocksRow[baseX + j]) {
          blocksRow[baseX + j].isCollideWith(this);
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

  Koopa.prototype.isCollideWith = function(ent) {
    if (ent instanceof Mario.Player && (this.dying || ent.invincibility)) {
      return;
    }

    //the first two elements of the hitbox array are an offset, so let's do this now.
    var hpos1 = [this.pos[0] + this.hitbox[0], this.pos[1] + this.hitbox[1]];
    var hpos2 = [ent.pos[0] + ent.hitbox[0], ent.pos[1] + ent.hitbox[1]];

    //if the hitboxes actually overlap
    if (!(hpos1[0] > hpos2[0]+ent.hitbox[2] || (hpos1[0]+this.hitbox[2] < hpos2[0]))) {
      if (!(hpos1[1] > hpos2[1]+ent.hitbox[3] || (hpos1[1]+this.hitbox[3] < hpos2[1]))) {
        if (ent instanceof Mario.Player) {
          if (ent.vel[1] > 0) {
            player.bounce = true;
          }
          if (this.shell) {
            sounds.kick.play();
            if (this.vel[0] === 0) {
              if (ent.left) { //I'm pretty sure this isn't the real logic.
                this.vel[0] = -4;
              } else {
                this.vel[0] = 4;
              }
            } else {
              if (ent.bounce) {
                this.vel[0] = 0;
              } else ent.damage();
            }
          } else if (ent.vel[1] > 0) { //then we get BOPPED.
            this.stomp();
          } else { //or the player gets hit
            ent.damage();
          }
        } else {
          if (this.shell && (ent instanceof Mario.Goomba)) {
            ent.bump();
          } else this.collideWall();
        }
      }
    }
  };

  Koopa.prototype.stomp = function() {
    //Turn this thing into a shell if it isn't already. Kick it if it is.
    player.bounce = true;
    if (this.para) {
      this.para = false;
      this.sprite.pos[0] -= 32;
    } else {
      sounds.stomp.play();
      this.shell = 360;
      this.sprite.pos[0] += 64;
      this.sprite.pos[1] += 16;
      this.sprite.size = [16,16];
      this.hitbox = [2,0,12,16];
      this.sprite.speed = 0;
      this.frames = [0,1];
      this.vel = [0,0];
      this.pos[1] += 16;
    }

  };

  Koopa.prototype.bump = function() {
    sounds.kick.play();
    if (this.flipping) return;
    this.flipping = true;
    this.sprite.pos = [160, 0];
    this.sprite.size = [16,16];
    this.hitbox = [2, 0, 12, 16];
    this.sprite.speed = 0;
    this.vel[0] = 0;
    this.vel[1] = -2.5;
    if (Mario.registerKill) Mario.registerKill(this);
  };
})();
