(function() {
	if (typeof Mario === 'undefined')
		window.Mario = {};

		var clownSheet = 'src/Player/HojaSpritesDF.png?v=2';
	var rect = function(x, y, w, h) { return [x, y, w, h]; };
	// HojaSpritesDF.png (1536x1024): rects medidos sobre la hoja real.
	// scaleH = alto máximo de la animación, para escalar todos los frames
	// al mismo tamaño físico (anclados abajo al centro).
	var clownAnimations = {
		idle: { fps: 6, loop: true, scaleH: 209, frames: [0,1,2,3], rects: [rect(76,49,85,208),rect(180,47,78,207),rect(278,46,78,209),rect(374,47,80,207)] },
		walk: { fps: 10, loop: true, scaleH: 203, frames: [0,1,2,3,4,5], rects: [rect(523,54,75,201),rect(613,51,74,203),rect(697,52,76,201),rect(773,55,90,198),rect(863,55,82,198),rect(953,58,79,197)] },
		run: { fps: 14, loop: true, scaleH: 202, frames: [0,1,2,3], rects: [rect(1085,63,99,191),rect(1178,62,100,199),rect(1278,62,114,186),rect(1392,72,106,192)] },
		jump: { fps: 8, loop: false, scaleH: 198, frames: [0,1,2,3], rects: [rect(50,323,104,180),rect(159,305,111,198),rect(276,317,91,169),rect(369,334,97,193)] },
		fall: { fps: 8, loop: true, scaleH: 185, frames: [0,1,2], rects: [rect(521,318,104,185),rect(627,341,93,185),rect(722,361,106,166)] },
		hurt: { fps: 8, loop: false, scaleH: 206, frames: [0,1], rects: [rect(896,326,105,201),rect(1011,324,92,206)] },
		die: { fps: 6, loop: false, scaleH: 213, frames: [0,1,2], rects: [rect(1184,323,77,213),rect(1275,398,103,138),rect(1373,465,145,77)] },
		attack: { fps: 12, loop: false, scaleH: 190, frames: [0,1,2,3], rects: [rect(33,611,138,172),rect(174,595,101,190),rect(284,594,150,190),rect(452,616,157,171)] },
		powerUp: { fps: 8, loop: false, scaleH: 190, frames: [0,1,2,3], rects: [rect(655,607,78,190),rect(737,613,119,185),rect(874,625,84,171),rect(978,615,96,182)] },
		hurryUp: { fps: 12, loop: true, scaleH: 178, frames: [0,1,2], rects: [rect(1148,615,120,178),rect(1263,623,111,170),rect(1363,624,117,169)] },
		special: { fps: 7, loop: false, scaleH: 194, frames: [0,1,2], rects: [rect(70,840,87,168),rect(204,818,129,194),rect(370,824,81,185)] }
	};

	var Player = Mario.Player = function(pos) {
		//I know, I know, there are a lot of variables tracking Mario's state.
		//Maybe these can be consolidated some way? We'll see once they're all in.
		this.power = 0;
		this.health = 3;
		this.maxHealth = 3;
		this.hammerCooldown = 0;
		this.attackTimer = 0;
		this.attackHit = false;
		this.coins = 0;
		this.powering = [];
		this.bounce = false;
		this.jumping = 0;
		this.canJump = true;
		this.invincibility = 0;
		this.crouching = false;
		this.fireballs = 0;
		this.noInput = false;
		this.targetPos = [];
		this.maxSpeed = 1.5;
		this.moveAcc = 0.07;

		Mario.Entity.call(this, {
			pos: pos,
						sprite: new Mario.Sprite(clownSheet, [0,0],[28,40],0),
				hitbox: [0,0,16,16]
			});
				this.sprite.isPlayer = true;
				this.sprite.animations = clownAnimations;
				this.sprite.renderOffset = [-6,-24];
			this.sprite.play('idle');
	};

	Mario.Util.inherits(Player, Mario.Entity);

	Player.prototype.meleeAttack = function() {
		if (this.hammerCooldown > 0 || this.dying || this.noInput) return false;
		this.attackTimer = 0.34;
		this.attackHit = false;
		this.hammerCooldown = 0.65;
		this.hitWithHammer();
		return true;
	}

	Player.prototype.heal = function(amount) {
		this.health = Math.min(this.maxHealth, this.health + amount);
	}

	Player.prototype.hitWithHammer = function() {
		if (this.attackHit) return;
		var attackX = this.left ? this.pos[0] - 16 : this.pos[0] + 16;
		var attackY = this.pos[1] - 8;
		var self = this;
		level.enemies.forEach(function(enemy) {
			if (attackX < enemy.pos[0] + enemy.hitbox[2] && attackX + 16 > enemy.pos[0] &&
				attackY < enemy.pos[1] + enemy.hitbox[3] && attackY + 24 > enemy.pos[1]) enemy.bump();
		});
		var col = Math.floor(attackX / 16);
		for (var row = Math.floor(attackY / 16); row <= Math.floor((attackY + 24) / 16); row++) {
			if (level.blocks[row] && level.blocks[row][col] && level.blocks[row][col].breakable) level.blocks[row][col].hammerBreak();
		}
		this.attackHit = true;
	}

	Player.prototype.moveRight = function() {
		this.maxSpeed = 1.5;
		this.moveAcc = 0.07;
		//we're on the ground
		if (this.vel[1] === 0 && this.standing) {
			if (this.crouching) {
				this.noWalk();
				return;
			}
			this.acc[0] = this.moveAcc;
			this.left = false;
		} else {
			this.acc[0] = this.moveAcc;
		}
	};

	Player.prototype.moveLeft = function() {
		this.maxSpeed = 1.5;
		this.moveAcc = 0.07;
		if (this.vel[1] === 0 && this.standing) {
			if (this.crouching) {
				this.noWalk();
				return;
			}
			this.acc[0] = -this.moveAcc;
			this.left = true;
		} else {
			this.acc[0] = -this.moveAcc;
		}
	};

	Player.prototype.noWalk = function() {
		this.maxSpeed = 0;
		if (this.vel[0] === 0) return;

		if (Math.abs(this.vel[0]) <= 0.1) {
			this.vel[0] = 0;
			this.acc[0] = 0;
		}

	};

	Player.prototype.crouch = function() {
		if (this.power === 0) {
			this.crouching = false;
			return;
		}

		if (this.standing) this.crouching = true;
	}

	Player.prototype.noCrouch = function() {
		this.crouching = false;
	}

	Player.prototype.jump = function() {
		if (this.vel[1] > 0) {
			return;
		}
		if (this.jumping) {
			this.jumping -= 1;
		} else if (this.standing && this.canJump) {
			this.jumping = 20;
			this.canJump = false;
			this.standing = false;
			this.vel[1] = -6;
			if (this.power === 0) {
				sounds.smallJump.currentTime = 0;
				sounds.smallJump.play();
			} else {
				sounds.bigJump.currentTime = 0;
				sounds.bigJump.play();
			}
		}
	};

	Player.prototype.noJump = function() {
		this.canJump = true;
		if (this.jumping) {
			if (this.jumping <= 16) {
				this.vel[1] = 0;
				this.jumping = 0;
			} else this.jumping -= 1;
		}
	};

  Player.prototype.setAnimation = function() {
	    if (this.attackTimer > 0) this.attackTimer -= 1 / 60;
    if (this.hurtTimer > 0) this.hurtTimer -= 1 / 60;
    if (this.starTime > 0) this.starTime -= 1;
	    this.sprite.flipX = this.left;
	    this.sprite.renderOffset = [-6,-24];

    // Priority prevents incompatible states from playing simultaneously.
    if (this.dying) { this.sprite.play('die'); return; }
    if (this.powering.length !== 0) { this.sprite.play('powerUp'); return; }
    if (this.starTime) { this.sprite.play('special'); return; }
    if (this.hurtTimer > 0) { this.sprite.play('hurt'); return; }
	    if (this.attackTimer > 0) { this.sprite.play('attack'); return; }
    if (this.flagging) { this.sprite.play('special'); return; }
    if (this.crouching) { this.sprite.play('idle'); this.sprite.setFrame(0); return; }

    if (this.vel[1] < 0) {
      this.sprite.play('jump');
      this.sprite.setFrame(this.vel[1] < -4.5 ? 0 : (this.vel[1] < -2.5 ? 1 : (this.vel[1] < -1 ? 2 : 3)));
      return;
    }
    if (this.vel[1] > 0 && !this.standing) { this.sprite.play('fall'); return; }

    var moving = Math.abs(this.vel[0]) > 0.05;
    if (!moving) { this.sprite.play('idle'); return; }
	    // Caminar a baja velocidad, correr a velocidad máxima.
    this.sprite.play(Math.abs(this.vel[0]) > 1 ? 'run' : 'walk');
  };

		Player.prototype.update = function(dt, vX) {
			if (this.hammerCooldown > 0) this.hammerCooldown = Math.max(0, this.hammerCooldown - dt);
				if (this.powering.length !== 0) {
				var next = this.powering.shift();
				if (next != 5 && this.shift && this.shift[next]) this.pos[1] += this.shift[next];
				if (this.powering.length === 0) {
					delete level.items[this.touchedItem];
				}
				this.setAnimation();
				return;
		}

		if (this.invincibility) {
			this.invincibility -= Math.round(dt * 60);
		}

		if (this.waiting) {
			this.waiting -= dt;
			if (this.waiting <= 0) {
				this.waiting = 0;
			} else return;
		}

		if (this.bounce) {
			this.bounce = false;
			this.standing = false;
			this.vel[1] = -3;
		}

		if (this.pos[0] <= vX) {
			this.pos[0] = vX;
			this.vel[0] = Math.max(this.vel[0], 0);
		}

		if (Math.abs(this.vel[0]) > this.maxSpeed) {
			this.vel[0] -= 0.05 *  this.vel[0] / Math.abs(this.vel[0]);
			this.acc[0] = 0;
		}

				if (this.dying){
					if (this.pos[1] < this.targetPos[1]) {
						this.vel[1] = 1;
					}
					this.dying -= 1 * dt;
			if (this.dying <= 0) {
				player = new Mario.Player(level.playerPos);
				level.loader.call();
				input.reset();
			}
		}
		else {
			this.acc[1] = 0.25
			if (this.pos[1] > 240) {
				this.die();
			}
		}

		if (this.piping) {
			this.acc = [0,0];
			var pos = [Math.round(this.pos[0]), Math.round(this.pos[1])]
			if (pos[0] === this.targetPos[0] && pos[1] === this.targetPos[1]) {
				this.piping = false;
				this.pipeLoc.call();
			}
		}

		if (this.flagging) {
			this.acc = [0,0];
		}

		if (this.exiting) {
			this.left = false;
			this.flagging = false;
			this.vel[0] = 1.5;
			if (this.pos[0] >= this.targetPos[0]) {
				this.sprite.size = [0,0];
				this.vel = [0,0];
				window.setTimeout(function() {
						player.sprite.size = [28,40];
					player.exiting = false;
					player.noInput = false;
					level.loader();
					if (player.power !== 0) player.pos[1] -= 16;
					music.overworld.currentTime = 0;
				}, 5000);
			}
		}

		//approximate acceleration
		this.vel[0] += this.acc[0];
		this.vel[1] += this.acc[1];
		this.pos[0] += this.vel[0];
		this.pos[1] += this.vel[1];

    this.setAnimation();
		this.sprite.update(dt);
	};

		Player.prototype.checkCollisions = function() {
			if (this.piping || this.dying) return;
			if (this.shooting > 0 && !this.meleeHit) {
				var attackX = this.left ? this.pos[0] - 16 : this.pos[0] + 16;
				var attackY = this.pos[1] - 8;
				level.enemies.forEach(function(enemy) {
					if (attackX < enemy.pos[0] + enemy.hitbox[2] && attackX + 16 > enemy.pos[0] &&
						attackY < enemy.pos[1] + enemy.hitbox[3] && attackY + 24 > enemy.pos[1]) {
						enemy.bump();
					}
				});
				this.meleeHit = true;
			}
			//x-axis first!
		var h = this.power > 0 ? 2 : 1;
		var w = 1;
		if (this.pos[1] % 16 !== 0) {
			h += 1;
		}
		if (this.pos[0] % 16 !== 0) {
			w += 1;
		}
		var baseX = Math.floor(this.pos[0] / 16);
		var baseY = Math.floor(this.pos[1] / 16);

		for (var i = 0; i < h; i++) {
			if (baseY + i < 0 || baseY + i >= 15) continue;
			for (var j = 0; j < w; j++) {
				if (baseY < 0) { i++;}
				if (level.statics[baseY + i][baseX + j]) {
					level.statics[baseY + i][baseX + j].isCollideWith(this);
				}
				if (level.blocks[baseY + i][baseX + j]) {
					level.blocks[baseY + i][baseX + j].isCollideWith(this);
				}
			}
		}
	};

	Player.prototype.powerUp = function(idx) {
		sounds.powerup.play();
		this.touchedItem = idx;
		this.heal(1);
		delete level.items[idx];
	};

		Player.prototype.damage = function() {
		if (this.invincibility) return;
		this.health -= 1;
		if (this.health <= 0) {
			this.die();
		} else {
			sounds.pipe.play();
			this.hurtTimer = 0.25;
			this.invincibility = 120;
		}
	};

		Player.prototype.die = function () {
		//TODO: rewrite the way sounds work to emulate the channels of an NES.
		music.overworld.pause();
		music.underground.pause();
		music.overworld.currentTime = 0;
		music.death.play();
		this.noWalk();
		this.noJump();

		this.acc[0] = 0;
			this.sprite.pos = [176, 32];
			this.sprite.play('die');
		this.power = 0;
		this.waiting = 0.5;
		this.dying = 2;

			if (this.pos[1] < 240) { //falling into a pit doesn't do the animation.
				this.targetPos = [this.pos[0], this.pos[1]-128];
				this.vel = [0,-5];
			} else {
				this.vel = [0,0];
				this.targetPos = [this.pos[0], this.pos[1] - 16];
			}
	};

	Player.prototype.star = function(idx) {
		delete level.items[idx];
		this.maxHealth += 1;
		this.health = this.maxHealth;
	}

	Player.prototype.pipe = function(direction, destination) {
		sounds.pipe.play();
		this.piping = true;
		this.pipeLoc = destination;
		switch(direction) {
			case "LEFT":
				this.vel = [-1,0];
				this.targetPos = [Math.round(this.pos[0]-16), Math.round(this.pos[1])]
				break;
			case "RIGHT":
				this.vel = [1,0];
				this.targetPos = [Math.round(this.pos[0]+16), Math.round(this.pos[1])]
				break;
			case "DOWN":
				this.vel = [0,1];
				this.targetPos = [Math.round(this.pos[0]), Math.round(this.pos[1]+this.hitbox[3])]
				break;
			case "UP":
				this.vel = [0,-1];
				this.targetPos = [Math.round(this.pos[0]), Math.round(this.pos[1]-this.hitbox[3])]
				break;
		}
	}

	Player.prototype.flag = function() {
		this.noInput = true;
		this.flagging = true;
		this.vel = [0, 2];
		this.acc = [0, 0];
	}

	Player.prototype.exit = function() {
		this.pos[0] += 16;
		this.targetPos[0] = level.exit * 16;
		this.left = true;
		this.setAnimation();
		this.waiting = 1;
		this.exiting = true;
	}
})();
