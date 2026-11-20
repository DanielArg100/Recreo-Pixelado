(function() {
  if (typeof Mario === 'undefined')
    window.Mario = {};

  // ---------------------------------------------------------------------------
  // Frames individuales del goblin, el coctel molotov y el fuego.
  // ---------------------------------------------------------------------------
  var DIR = 'src/goblin/frames/';
  var ASSET_VERSION = '?v=5';
  var f = function(name) { return DIR + name + ASSET_VERSION; };

  var goblinFrames = {
    idle: [
      f('goblin_idle1.png'), f('goblin_idle2.png'),
      f('goblin_idle3.png'), f('goblin_idle4.png')
    ],
    attack: [
      f('goblin_attack1.png'), f('goblin_attack2.png'),
      f('goblin_attack3.png'), f('goblin_attack4.png')
    ],
    hurt: [f('goblin_hurt1.png'), f('goblin_hurt2.png')],
    die: [f('goblin_die1.png'), f('goblin_die2.png'), f('goblin_die3.png')]
  };

  var molotovFrames = [
    f('molotov1.png'), f('molotov2.png'),
    f('molotov3.png'), f('molotov4.png')
  ];

  var fireFrames = [
    f('Fuego_1.png'), f('Fuego_2.png'),
    f('Fuego_3.png'), f('Fuego_4.png')
  ];

  // Altura de referencia de cada animación en píxeles de la imagen original.
  // El alto final en el juego es el size[1] del sprite.
  var GOBLIN_SCALE_H = 196;
  var MOLOTOV_SCALE_H = 110;
  var FIRE_SCALE_H = 106;

  var goblinAnimations = {
    idle:   { fps: 6,   loop: true,  scaleH: GOBLIN_SCALE_H, images: goblinFrames.idle },
    attack: { fps: 8.8, loop: false, scaleH: GOBLIN_SCALE_H, images: goblinFrames.attack },
    hurt:   { fps: 5.8, loop: false, scaleH: GOBLIN_SCALE_H, images: goblinFrames.hurt },
    die:    { fps: 3.6, loop: false, scaleH: GOBLIN_SCALE_H, images: goblinFrames.die }
  };

  var molotovAnimations = {
    fly: { fps: 9, loop: true, scaleH: MOLOTOV_SCALE_H, images: molotovFrames }
  };

  var fireAnimations = {
    burn: { fps: 8, loop: true, scaleH: FIRE_SCALE_H, images: fireFrames }
  };

  var framePaths = [];
  for (var anim in goblinFrames) framePaths = framePaths.concat(goblinFrames[anim]);
  framePaths = framePaths.concat(molotovFrames, fireFrames);
  if (typeof resources !== 'undefined' && resources.load) resources.load(framePaths);

  // Proyectiles y áreas de fuego compartidos con game.js.
  var goblinShots = Mario.goblinShots = [];
  var fireAreas = Mario.fireAreas = [];

  // ---------------------------------------------------------------------------
  // Utilidad de colisión AABB.
  // ---------------------------------------------------------------------------
  var collide = function(aPos, aBox, bPos, bBox) {
    var ax = aPos[0] + aBox[0];
    var ay = aPos[1] + aBox[1];
    var bx = bPos[0] + bBox[0];
    var by = bPos[1] + bBox[1];
    return !(ax > bx + bBox[2] || ax + aBox[2] < bx ||
             ay > by + bBox[3] || ay + aBox[3] < by);
  };

  // ---------------------------------------------------------------------------
  // Goblin: torreta fija con dos vidas. No camina, no patrulla y no persigue:
  // se queda en su puesto alto lanzando cocteles molotov.
  // ---------------------------------------------------------------------------
  var Goblin = Mario.Goblin = function(pos) {
    this.hp = 2;
    this.state = 'idle';          // idle | attack | hurt | die
    this.throwCooldown = 1.5 + Math.random() * 2;
    this.attackTimer = 0;
    this.attackSpawned = false;
    this.hurtTimer = 0;
    this.hurtInvuln = 0;
    this.knockbackVel = 0;
    this.dying = false;
    this.dead = false;
    this.dyingTimer = 0;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    // Campo de tiro amplio: las torretas están varias tiles por encima del suelo.
    this.vision = 168;
    this.visionY = 108;

    Mario.Entity.call(this, {
      pos: pos,
      sprite: new Mario.Sprite(goblinFrames.idle[0], [0,0], [22,30], 0, [0]),
      hitbox: [1,2,14,14]
    });

    this.sprite.animations = goblinAnimations;
    this.sprite.renderOffset = [-3,-14];
    this.sprite.play('idle');
    this.left = this.dir < 0;
    this.sprite.flipX = this.left;
    this.idx = level.enemies.length;
  };

  Mario.Util.inherits(Goblin, Mario.Entity);

  Goblin.prototype.canSeePlayer = function() {
    if (this.throwCooldown > 0) return false;
    if (player.dying || player.piping || player.noInput) return false;
    var dx = (player.pos[0] + 8) - (this.pos[0] + 8);
    var dy = (player.pos[1] + 8) - (this.pos[1] + 8);
    return Math.abs(dx) < this.vision && Math.abs(dy) < this.visionY && Math.abs(dx) > 16;
  };

  Goblin.prototype.startAttack = function() {
    this.state = 'attack';
    this.dir = player.pos[0] < this.pos[0] ? -1 : 1;
    this.attackTimer = 0.45;
    this.attackSpawned = false;
    this.vel[0] = 0;
    this.sprite.play('attack');
    if (Mario.onGoblinAttack) Mario.onGoblinAttack(this);
  };

  Goblin.prototype.throwMolotov = function() {
    var startX = this.pos[0] + 8;
    var startY = this.pos[1] - 2;
    var targetX = player.pos[0] + 8;
    var targetY = player.pos[1] + 8;
    var dir = targetX < startX ? -1 : 1;

    // Vuelo lento y parabólico: se puede esquivar y los frames se aprecian.
    var vx = dir * 1.5;
    var t = Math.abs(targetX - startX) / Math.abs(vx);
    t = Math.max(18, Math.min(t, 95));
    var g = 0.05;
    var vy = (targetY - startY - 0.5 * g * t * t) / t;
    // Un poco más de caída permite acertar también a corta distancia desde lo alto.
    vy = Math.max(-3.4, Math.min(3.0, vy));

    goblinShots.push(new Molotov([startX - 8, startY - 8], vx, vy, this));
    this.throwCooldown = 3 + Math.random() * 2;

    sounds.fireball.currentTime = 0;
    sounds.fireball.play();
  };

  Goblin.prototype.bump = function() {
    if (this.dying || this.dead || this.hurtInvuln > 0) return;

    this.hp -= 1;
    if (this.hp <= 0) {
      this.die();
      return;
    }

    sounds.kick.currentTime = 0;
    sounds.kick.play();

    // El empuje va en dirección contraria al jugador que golpeó.
    var dir = player.pos[0] < this.pos[0] ? 1 : -1;
    this.state = 'hurt';
    this.hurtTimer = 0.34;
    this.hurtInvuln = 0.35;
    this.knockbackVel = dir * 2;
    this.vel[0] = 0;
    this.sprite.play('hurt');
    if (Mario.onGoblinHit) Mario.onGoblinHit(this);
  };

  Goblin.prototype.die = function() {
    if (this.dying) return;
    this.dying = true;
    this.state = 'die';
    this.dyingTimer = 0.8;
    this.vel[0] = 0;
    this.acc[0] = 0;
    this.sprite.play('die');
    sounds.kick.currentTime = 0;
    sounds.kick.play();
    if (Mario.registerKill) Mario.registerKill(this);
    if (Mario.onGoblinDefeated) Mario.onGoblinDefeated(this);
  };

  Goblin.prototype.remove = function() {
    this.dead = true;
    delete level.enemies[this.idx];
  };

  Goblin.prototype.collideWall = function() {
    if (this.dying) return;
    // La torreta no camina, pero un empujón puede estrellarla contra una pared.
    if (this.state === 'hurt') this.knockbackVel = 0;
    this.vel[0] = 0;
  };

  Goblin.prototype.applyPhysics = function() {
    this.acc[1] = 0.2;
    this.vel[1] += this.acc[1];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
  };

  Goblin.prototype.update = function(dt, vX) {
    if (this.dead) return;
    if (this.pos[0] - vX > 336) return; // fuera de pantalla: no piensa ni se mueve
    if (this.pos[0] - vX < -32) { this.remove(); return; }

    if (this.hurtInvuln > 0) this.hurtInvuln = Math.max(0, this.hurtInvuln - dt);

    if (this.dying) {
      this.vel[0] = 0;
      this.dyingTimer -= dt;
      this.applyPhysics();
      this.sprite.update(dt);
      if (this.dyingTimer <= 0) this.remove();
      return;
    }

    this.throwCooldown = Math.max(0, this.throwCooldown - dt);

    if (this.state === 'attack') {
      this.vel[0] = 0;
      this.attackTimer -= dt;
      if (!this.attackSpawned && this.attackTimer <= 0.22) {
        this.attackSpawned = true;
        this.throwMolotov();
      }
      if (this.attackTimer <= 0) {
        this.state = 'idle';
        this.vel[0] = 0;
        this.sprite.play('idle');
      }
    } else if (this.state === 'hurt') {
      this.hurtTimer -= dt;
      this.vel[0] = this.knockbackVel;
      this.knockbackVel *= 0.82;
      if (this.hurtTimer <= 0) {
        this.state = 'idle';
        this.vel[0] = 0;
        this.sprite.play('idle');
      }
    } else {
      // Torreta quieta: solo gira la cabeza para apuntar y espera su turno.
      this.vel[0] = 0;
      this.sprite.play('idle');

      if (!player.dying && !player.piping && !player.noInput &&
          Math.abs(player.pos[0] - this.pos[0]) < 200) {
        this.dir = player.pos[0] < this.pos[0] ? -1 : 1;
      }
      if (this.canSeePlayer()) this.startAttack();
    }

    this.left = this.dir < 0;
    this.sprite.flipX = this.left;
    this.applyPhysics();
    this.sprite.update(dt);
  };

  Goblin.prototype.checkCollisions = function() {
    if (this.dead) return;

    var h = this.pos[1] % 16 === 0 ? 1 : 2;
    var w = this.pos[0] % 16 === 0 ? 1 : 2;
    var baseX = Math.floor(this.pos[0] / 16);
    var baseY = Math.floor(this.pos[1] / 16);

    if (baseY + h > 15) { this.remove(); return; }

    for (var i = 0; i < h; i++) {
      for (var j = 0; j < w; j++) {
        if (level.statics[baseY + i] && level.statics[baseY + i][baseX + j]) {
          level.statics[baseY + i][baseX + j].isCollideWith(this);
        }
        if (level.blocks[baseY + i] && level.blocks[baseY + i][baseX + j]) {
          level.blocks[baseY + i][baseX + j].isCollideWith(this);
        }
      }
    }

    if (!this.dying) this.isCollideWith(player);
  };

  Goblin.prototype.isCollideWith = function(ent) {
    if (!(ent instanceof Mario.Player)) return;
    if (this.dying || ent.dying || ent.invincibility) return;
    if (!collide(this.pos, this.hitbox, ent.pos, ent.hitbox)) return;

    // Caer encima del goblin no lo daña: rebota y hay que usar el martillo.
    var playerBottom = ent.pos[1] + ent.hitbox[1] + ent.hitbox[3];
    var goblinTop = this.pos[1] + this.hitbox[1];
    if (ent.vel[1] > 0 && playerBottom <= goblinTop + 10) {
      ent.bounce = true;
      return;
    }

    ent.damage();
  };

  // ---------------------------------------------------------------------------
  // Coctel molotov: proyectil lento con gravedad. Explota contra cualquier
  // tile sólido, tubería o entidad, y deja un área de fuego.
  // ---------------------------------------------------------------------------
  var Molotov = Mario.Molotov = function(pos, vx, vy, thrower) {
    Mario.Entity.call(this, {
      pos: pos,
      sprite: new Mario.Sprite(molotovFrames[0], [0,0], [16,16], 0, [0]),
      hitbox: [3,2,10,12]
    });

    this.sprite.animations = molotovAnimations;
    this.sprite.play('fly');
    this.sprite.flipX = vx < 0;
    this.vel[0] = vx;
    this.vel[1] = vy;
    this.thrower = thrower;
    this.life = 4;
    this.dead = false;
    this.idx = goblinShots.length;
  };

  Mario.Util.inherits(Molotov, Mario.Entity);

  Molotov.prototype.update = function(dt, vX) {
    if (this.dead) return;

    this.life -= dt;
    this.vel[1] += 0.05;
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    this.sprite.update(dt);

    if (this.life <= 0 || this.pos[1] > 260 ||
        this.pos[0] < vX - 96 || this.pos[0] > vX + 352) {
      this.remove();
    }
  };

  Molotov.prototype.checkCollisions = function() {
    if (this.dead) return;
    if (this.hitsSolid() || this.hitsPipe() || this.hitsEntity()) this.explode();
  };

  Molotov.prototype.hitsSolid = function() {
    var left = this.pos[0] + this.hitbox[0];
    var top = this.pos[1] + this.hitbox[1];
    var right = left + this.hitbox[2];
    var bottom = top + this.hitbox[3];
    var x0 = Math.floor(left / 16);
    var x1 = Math.floor((right - 0.01) / 16);
    var y0 = Math.floor(top / 16);
    var y1 = Math.floor((bottom - 0.01) / 16);

    for (var y = y0; y <= y1; y++) {
      if (y < 0) continue;
      if (y >= 15) return true;
      for (var x = x0; x <= x1; x++) {
        if (x < 0) return true;
        if (level.statics[y] && level.statics[y][x]) return true;
        if (level.blocks[y] && level.blocks[y][x]) return true;
      }
    }
    return false;
  };

  Molotov.prototype.hitsPipe = function() {
    for (var i = 0; i < level.pipes.length; i++) {
      var pipe = level.pipes[i];
      if (!pipe || !pipe.hitbox) continue;
      if (collide(this.pos, this.hitbox, pipe.pos, pipe.hitbox)) return true;
    }
    return false;
  };

  Molotov.prototype.hitsEntity = function() {
    if (!player.dying && collide(this.pos, this.hitbox, player.pos, player.hitbox)) return true;

    for (var i = 0; i < level.enemies.length; i++) {
      var enemy = level.enemies[i];
      if (!enemy || enemy === this.thrower || enemy.dying) continue;
      if (collide(this.pos, this.hitbox, enemy.pos, enemy.hitbox)) return true;
    }
    return false;
  };

  Molotov.prototype.explode = function() {
    if (this.dead) return;

    var centerX = this.pos[0] + 8;
    var bottomY = this.pos[1] + 16;
    this.remove();

    fireAreas.push(new FireArea([centerX - 18, bottomY - 20]));

    sounds.bump.currentTime = 0;
    sounds.bump.play();
  };

  Molotov.prototype.remove = function() {
    this.dead = true;
    delete goblinShots[this.idx];
  };

  Molotov.prototype.bump = function() {};

  // ---------------------------------------------------------------------------
  // Fuego: daña únicamente al jugador, una vez, y dura 2 segundos.
  // ---------------------------------------------------------------------------
  var FireArea = Mario.FireArea = function(pos) {
    Mario.Entity.call(this, {
      pos: pos,
      sprite: new Mario.Sprite(fireFrames[0], [0,0], [36,20], 0, [0]),
      hitbox: [6,8,24,12]
    });

    this.sprite.animations = fireAnimations;
    this.sprite.play('burn');
    this.life = 2;
    this.hitPlayer = false;
    this.dead = false;
    this.idx = fireAreas.length;
  };

  Mario.Util.inherits(FireArea, Mario.Entity);

  FireArea.prototype.update = function(dt) {
    if (this.dead) return;
    this.life -= dt;
    this.sprite.update(dt);
    if (this.life <= 0) this.remove();
  };

  FireArea.prototype.checkCollisions = function() {
    if (this.dead || this.hitPlayer) return;
    if (player.dying || player.invincibility) return;

    if (collide(this.pos, this.hitbox, player.pos, player.hitbox)) {
      this.hitPlayer = true;
      player.damage();
    }
  };

  FireArea.prototype.remove = function() {
    this.dead = true;
    delete fireAreas[this.idx];
  };

  FireArea.prototype.bump = function() {};
})();
