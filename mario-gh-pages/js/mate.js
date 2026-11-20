(function() {
  if (typeof Mario === 'undefined') window.Mario = {};

  // ---------------------------------------------------------------------------
  // MATE: material que sueltan los enemigos y los bloques rotos con martillo.
  // Cada material toma la apariencia de uno de los frames de src/argentina.
  // ---------------------------------------------------------------------------
  var MATE_DROP_CHANCE = Mario.MATE_DROP_CHANCE = 0.25;
  Mario.rollMateDrop = function() {
    return Math.random() < MATE_DROP_CHANCE;
  };
  // Frames que siguen existiendo en src/argentina/frames. Se agrupan en
  // rangos para no depender de una numeración continua.
  var MATE_FRAME_INDICES = [];
  [
    [0, 27], [30, 30], [37, 50], [52, 60], [64, 67]
  ].forEach(function(range) {
    for (var i = range[0]; i <= range[1]; i++) MATE_FRAME_INDICES.push(i);
  });

  var MATE_FRAMES = Mario.MATE_FRAMES = MATE_FRAME_INDICES.map(function(i) {
    return 'src/argentina/frames/argentina_' + i + '.png';
  });

  // Si se borra otro frame más adelante, el cargador devuelve un marcador.
  // Lo sacamos de la lista antes de que se construyan los niveles.
  resources.onReady(function() {
    var available = MATE_FRAMES.filter(function(path) {
      var img = resources.get(path);
      return img && !img.isFallback;
    });
    if (available.length) {
      MATE_FRAMES = Mario.MATE_FRAMES = available;
    }
  });

  var pickFrame = function() {
    return Math.floor(Math.random() * MATE_FRAMES.length);
  };

  var SPAWN_ANIM_SECONDS = 0.38;
  var easeOutCubic = function(t) { return 1 - Math.pow(1 - t, 3); };
  var easeOutBack = function(t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  // Sprite de imagen completa, respetando la proporción original del frame.
  var makeMateSprite = function(frameIndex) {
    var path = MATE_FRAMES[frameIndex];
    var img = resources.get(path);
    var nw = img ? img.width : 32;
    var nh = img ? img.height : 32;
    var scale = 16 / nh;
    var sprite = new Mario.Sprite(path, [0, 0], [Math.max(8, Math.round(nw * scale)), 16], 0, [0]);
    sprite.frameRects = [[0, 0, nw, nh]];
    sprite.frameScale = scale;
    return sprite;
  };

  var MateItem = Mario.MateItem = function(pos, frameIndex) {
    this.frameIndex = frameIndex == null ? pickFrame() : frameIndex;
    this.dead = false;
    this.idx = -1;
    // Un segundo antes de poder agarrarlo: durante ese tiempo aparece y late.
    this.pickupDelay = 1;
    this.spawnAnim = 0;
    Mario.Entity.call(this, {
      pos: pos.slice(),
      sprite: makeMateSprite(this.frameIndex),
      hitbox: [0, 0, 16, 16]
    });
  };

  Mario.Util.inherits(MateItem, Mario.Entity);

  MateItem.prototype.spawn = function() {
    this.idx = level.items.length;
    level.items.push(this);
    this.pickupDelay = 1;
    this.spawnAnim = 0;
    this.vel[0] = 0;
    this.vel[1] = 0;
    if (sounds && sounds.itemAppear) {
      sounds.itemAppear.currentTime = 0;
      sounds.itemAppear.play();
    }
  };

  MateItem.prototype.remove = function() {
    if (this.dead) return;
    this.dead = true;
    delete level.items[this.idx];
  };

  MateItem.prototype.render = function(ctx, vX, vY) {
    var t = Math.min(1, this.spawnAnim / SPAWN_ANIM_SECONDS);
    // Después de aparecer, parpadea mientras todavía no se puede agarrar.
    if (t === 1 && this.pickupDelay > 0 && Math.floor(this.pickupDelay * 12) % 2 === 0) return;

    var scale = 0.35 + 0.65 * easeOutBack(t);
    var rise = (1 - easeOutCubic(t)) * 10;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, t * 2.5);
    ctx.translate(
      Math.round(this.pos[0] - vX + 8),
      Math.round(this.pos[1] - vY + 8 - rise)
    );
    ctx.scale(scale, scale);
    this.sprite.render(ctx, -8, -8, 0, 0);
    ctx.restore();
  };

  MateItem.prototype.update = function(dt) {
    if (this.dead) return;
    if (this.spawnAnim < SPAWN_ANIM_SECONDS) {
      this.spawnAnim = Math.min(SPAWN_ANIM_SECONDS, this.spawnAnim + dt);
    }
    if (this.pickupDelay > 0) this.pickupDelay = Math.max(0, this.pickupDelay - dt);
    this.sprite.update(dt);

    // Se queda quieto donde apareció; solo se pierde si sale de pantalla.
    if (this.pos[0] < vX - 96 || this.pos[0] > vX + 352) this.remove();
  };

  MateItem.prototype.collideWall = function() { /* el material no se mueve */ };

  MateItem.prototype.checkCollisions = function() {
    if (this.dead || this.pickupDelay > 0 || !player || player.dying) return;
    var ax = this.pos[0] + this.hitbox[0];
    var ay = this.pos[1] + this.hitbox[1];
    var bx = player.pos[0] + player.hitbox[0];
    var by = player.pos[1] + player.hitbox[1];
    if (ax < bx + player.hitbox[2] && ax + this.hitbox[2] > bx &&
        ay < by + player.hitbox[3] && ay + this.hitbox[3] > by) {
      Mario.MateSystem.collect(this);
      this.remove();
    }
  };

  MateItem.prototype.bump = function() { /* el material no rebota */ };

  // Deja el material quieto donde apareció el enemigo o se rompió el bloque.
  Mario.dropMate = function(pos) {
    var item = new MateItem([pos[0], pos[1] - 8]);
    item.spawn();
    return item;
  };

  // ---------------------------------------------------------------------------
  // Sistema de inventario, cebado y efectos.
  // ---------------------------------------------------------------------------
  var EFFECT_SECONDS = 14;

  // Un efecto por posición: el índice es lo que elige Math.random().
  var MATE_EFFECTS = Mario.MATE_EFFECTS = [
    {
      id: 'jump', label: '¡SALTARÁS MÁS!', kind: 'extra',
      run: function(self) {
        self.setTimed('jump', EFFECT_SECONDS);
        self.startEffect('jump', 'jump', EFFECT_SECONDS);
      }
    },
    {
      id: 'heal', label: '¡TE CURASTE!', kind: 'win',
      run: function() { player.heal(1); }
    },
    {
      id: 'hurt', label: '¡EL MATE TE PEGÓ!', kind: 'hurt',
      run: function() { player.invincibility = 0; player.damage(); }
    },
    {
      id: 'maxHealthUp', label: '¡+1 VIDA MÁXIMA!', kind: 'extra',
      run: function() {
        Mario.runState.mateMaxHealth = (Mario.runState.mateMaxHealth || 0) + 1;
        player.maxHealth = Math.max(1, 3 + Mario.runState.mateMaxHealth);
        player.health = player.maxHealth;
      }
    },
    {
      id: 'maxHealthDown', label: '¡-1 VIDA MÁXIMA!', kind: 'hurt',
      run: function() {
        Mario.runState.mateMaxHealth = Math.max(-2, (Mario.runState.mateMaxHealth || 0) - 1);
        player.maxHealth = Math.max(1, 3 + Mario.runState.mateMaxHealth);
        player.health = Math.min(player.health, player.maxHealth);
      }
    },
    {
      id: 'attemptUp', label: '¡+1 INTENTO!', kind: 'extra',
      run: function() { Mario.runState.attempts += 1; }
    },
    {
      id: 'attemptDown', label: '¡-1 INTENTO!', kind: 'hurt',
      run: function() { Mario.runState.attempts = Math.max(0, Mario.runState.attempts - 1); }
    },
    {
      id: 'fast', label: '¡MÁS RÁPIDO!', kind: 'extra',
      run: function(self) {
        self.setTimed('speed', EFFECT_SECONDS);
        player.speedBoost = 1.35;
        self.startEffect('speed', 'fast', EFFECT_SECONDS);
      }
    },
    {
      id: 'slow', label: '¡MÁS LENTO!', kind: 'hurt',
      run: function(self) {
        self.setTimed('speed', EFFECT_SECONDS);
        player.speedBoost = 0.6;
        self.startEffect('speed', 'slow', EFFECT_SECONDS);
      }
    },
    {
      id: 'hammer', label: '¡MARTILLO MÁS LARGO!', kind: 'extra',
      run: function() {
        Mario.runState.mateHammerRange = (Mario.runState.mateHammerRange || 0) + 12;
        player.hammerRange = Mario.runState.mateHammerRange;
      }
    },
    {
      id: 'dizzy', label: '¡ESTÁS MAREO!', kind: 'hurt',
      run: function(self) {
        self.screen.dizzy = 8;
        self.startEffect('dizzy', 'dizzy', 8);
      }
    },
    {
      id: 'trippy', label: '¡ALUCINANDO!', kind: 'extra',
      run: function(self) {
        self.screen.trippy = 10;
        self.startEffect('trippy', 'trippy', 10);
      }
    },
    {
      id: 'inverted', label: '¡CONTROLES INVERTIDOS!', kind: 'hurt',
      run: function(self) {
        self.inverted = 12;
        self.startEffect('inverted', 'inverted', 12);
      }
    }
  ];

  var EFFECT_BY_ID = {};
  MATE_EFFECTS.forEach(function(effect) { EFFECT_BY_ID[effect.id] = effect; });

  var MateSystem = Mario.MateSystem = {
    inventory: [],
    brewing: false,
    brewProgress: 0,
    brewDuration: 2.2,
    locksPlayer: false,
    inverted: 0,
    screen: { dizzy: 0, trippy: 0 },
    timed: {},
    // Efectos temporales visibles en el HUD: id, etiqueta, duración y resto.
    active: {},

    reset: function() {
      this.inventory = [];
      this.brewing = false;
      this.brewProgress = 0;
      this.locksPlayer = false;
      this.inverted = 0;
      this.screen.dizzy = 0;
      this.screen.trippy = 0;
      this.timed = {};
      this.active = {};
      this.effectIndex = -1;
      this.lastEffect = null;
      if (typeof player !== 'undefined') {
        player.jumpBoost = false;
        player.speedBoost = 1;
      }
      updateMateHud();
    },

    collect: function(item) {
      this.inventory.push({ frameIndex: item.frameIndex });
      var replaced = false;
      if (this.inventory.length > 2) {
        this.inventory.shift();
        replaced = true;
      }
      if (Mario.onMateCollect) Mario.onMateCollect(replaced);
      updateMateHud();
    },

    startBrew: function() {
      if (this.brewing || this.inventory.length < 2) return false;
      if (!player || player.dying || player.piping || player.noInput) return false;
      this.brewing = true;
      this.brewProgress = 0;
      this.locksPlayer = true;
      player.noWalk();
      if (Mario.onMateBrewStart) Mario.onMateBrewStart();
      updateMateHud();
      return true;
    },

    update: function(dt) {
      if (this.brewing) {
        this.brewProgress += dt;
        if (this.brewProgress >= this.brewDuration) this.finishBrew();
        else updateMateHud();
      }

      if (this.inverted > 0) {
        this.inverted = Math.max(0, this.inverted - dt);
        if (this.inverted === 0 && Mario.onMateEffectEnd) Mario.onMateEffectEnd();
      }
      ['dizzy', 'trippy'].forEach(function(key) {
        if (MateSystem.screen[key] > 0) MateSystem.screen[key] = Math.max(0, MateSystem.screen[key] - dt);
      });

      for (var name in this.timed) {
        if (!this.timed.hasOwnProperty(name)) continue;
        this.timed[name] -= dt;
        if (this.timed[name] <= 0) {
          delete this.timed[name];
          this.clearTimedEffect(name);
        }
      }
      this.syncActiveEffects();
      updateMateScreenFx();
      updateMateHud();
    },

    // Registra un efecto temporal para que el HUD muestre su cuenta regresiva.
    startEffect: function(slot, id, seconds) {
      var def = EFFECT_BY_ID[id];
      if (!def) return;
      this.active[slot] = {
        id: id,
        label: def.label,
        kind: def.kind,
        duration: seconds,
        remaining: seconds
      };
    },

    // El resto mostrado siempre coincide con el temporizador real del efecto.
    syncActiveEffects: function() {
      var remaining = {
        jump: this.timed.jump || 0,
        speed: this.timed.speed || 0,
        dizzy: this.screen.dizzy,
        trippy: this.screen.trippy,
        inverted: this.inverted
      };
      for (var slot in this.active) {
        if (!this.active.hasOwnProperty(slot)) continue;
        var value = remaining[slot];
        if (!value || value <= 0) delete this.active[slot];
        else this.active[slot].remaining = value;
      }
    },

    clearTimedEffect: function(name) {
      if (name === 'jump' && player) player.jumpBoost = false;
      if (name === 'speed' && player) player.speedBoost = 1;
    },

    setTimed: function(name, seconds) {
      if (player) {
        if (name === 'jump') player.jumpBoost = true;
        if (name === 'speed') player.speedBoost = 1.35;
      }
      this.timed[name] = seconds;
    },

    finishBrew: function() {
      this.brewing = false;
      this.brewProgress = 0;
      this.locksPlayer = false;
      this.inventory.length = 0;
      this.applyRandomEffect();
      if (Mario.onMateReady) Mario.onMateReady(this.lastEffect);
      updateMateHud();
    },

    effectIndex: -1,

    applyRandomEffect: function() {
      var self = this;
      var index = Math.floor(Math.random() * MATE_EFFECTS.length);
      var effect = MATE_EFFECTS[index];
      effect.run(self);
      this.effectIndex = index;
      this.lastEffect = {
        id: effect.id,
        label: effect.label,
        kind: effect.kind
      };
      return this.lastEffect;
    }
  };

  // Actualiza el HUD del mate. Se define como función global para poder
  // llamarla desde game.js sin acoplar este archivo al DOM del juego.
  function updateMateHud() {
    if (typeof window.updateMateHud === 'function') window.updateMateHud();
  }

  function updateMateScreenFx() {
    var screen = document.getElementById('game-screen');
    if (!screen) return;
    screen.classList.toggle('mate-dizzy', MateSystem.screen.dizzy > 0);
    screen.classList.toggle('mate-trippy', MateSystem.screen.trippy > 0);
  }
})();
