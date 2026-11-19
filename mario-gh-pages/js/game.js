var requestAnimFrame = (function(){
  return window.requestAnimationFrame       ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function(callback){
      window.setTimeout(callback, 1000 / 60);
    };
})();

//create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext('2d');
var updateables = [];
var fireballs = [];
var goblinShots = Mario.goblinShots;
var fireAreas = Mario.fireAreas;
var player = new Mario.Player([0,0]);

// Estado de la partida: intentos, checkpoint y reacciones del hub.
var KO_FOR_ATTEMPT = 15;
var runState = Mario.runState = {
  attempts: 3,
  kills: 0,
  killsSinceExtra: 0,
  checkpoint: null,
  cleared: false,
  over: false,
  hurtFlash: 0,
  reaction: null
};
var MOODS = {
  calm:   { src: 'src/hud/head_calm.png?v=1',   label: 'TRANQUILO' },
  hurt:   { src: 'src/hud/head_hurt.png?v=1',   label: 'AY, ME DOLIÓ' },
  danger: { src: 'src/hud/head_danger.png?v=1', label: '¡MODO PÁNICO!' },
  win:    { src: 'src/hud/head_win.png?v=1',    label: '¡RECREO GANADO!' }
};
var hudMood = '';
var hudPopTimeout = null;
var lastHudHealth = player.health;
var lastHudAttempts = -1;
var lastHudProgress = -1;
var toastTimeout = null;

var schoolBackgrounds = {
  first: 'src/fondos/Fondo1.png',
  second: 'src/fondos/FondoNuevo.webp'
};
var cachedSchoolBackgrounds = { first: null, second: null };

//we might have to get the size and calculate the scaling
//but this method should let us make it however big.
//Cool!
//TODO: Automatically scale the game to work and look good on widescreen.
//TODO: fiddling with scaled sprites looks BETTER, but not perfect. Hmm.
canvas.width = 762;
canvas.height = 720;
ctx.scale(3,3);
ctx.imageSmoothingEnabled = false;
var gameScreen = document.getElementById('game-screen');
(gameScreen || document.body).appendChild(canvas);

//viewport
var vX = 0,
    vY = 0,
    vWidth = 256,
    vHeight = 240;

//load our images
resources.load([
  'sprites/enemy.png',
  'sprites/tiles.png',
  'sprites/items.png',
  'sprites/enemyr.png',
	  'src/hojaDeSprites/HojaSpritesDF.png',
  'src/hojaDeSprites/tilesetExterior.png',
  'src/hojaDeSprites/tilesetEscolar.png',
  'src/hojaDeSprites/clown-animations.png',
  'src/tiles/frames/exterior/exterior_53.png',
  'src/tiles/frames/exterior/exterior_14.png',
  schoolBackgrounds.first,
  schoolBackgrounds.second
]);

resources.onReady(init);
var level;
var sounds;
var music;

//initialize
var lastTime;
function init() {
  prepareSchoolBackgrounds();
  music = {
    overworld: new Audio('sounds/aboveground_bgm.ogg'),
    underground: new Audio('sounds/underground_bgm.ogg'),
    clear: new Audio('sounds/stage_clear.wav'),
    death: new Audio('sounds/mariodie.wav')
  };
  sounds = {
    smallJump: new Audio('sounds/jump-small.wav'),
    bigJump: new Audio('sounds/jump-super.wav'),
    breakBlock: new Audio('sounds/breakblock.wav'),
    bump: new Audio('sounds/bump.wav'),
    coin: new Audio('sounds/coin.wav'),
    fireball: new Audio('sounds/fireball.wav'),
    flagpole: new Audio('sounds/flagpole.wav'),
    kick: new Audio('sounds/kick.wav'),
    pipe: new Audio('sounds/pipe.wav'),
    itemAppear: new Audio('sounds/itemAppear.wav'),
    powerup: new Audio('sounds/powerup.wav'),
    stomp: new Audio('sounds/stomp.wav')
  };
  Mario.oneone();
  lastTime = Date.now();
  main();
}

var gameTime = 0;

//set up the game loop
function main() {
  var now = Date.now();
  // Avoid a large physics step after a tab switch or a temporary frame drop.
  var dt = Math.min((now - lastTime) / 1000.0, 0.05);

  update(dt);
  render();

  lastTime = now;
  requestAnimFrame(main);
}

function update(dt) {
  gameTime += dt;

  // Durante el cartel de "sin intentos" la partida queda congelada.
  if (runState.over) {
    updateGameHud(dt);
    return;
  }

  handleInput(dt);
  updateEntities(dt, gameTime);

	checkCollisions();
	checkCheckpoint();
	updateGameHud(dt);
}

function checkCheckpoint() {
  if (runState.checkpoint || !level || !level.checkpointX) return;
  if (player.dying || player.piping) return;
  if (player.pos[0] >= level.checkpointX) {
    var respawn = level.checkpointRespawn || [level.checkpointX + 80, 192];
    Mario.onCheckpoint(respawn[0], respawn[1]);
  }
}

function updateGameHud(dt) {
	var hearts = document.getElementById('health-hearts');
	var healthFill = document.getElementById('health-fill');
	var ring = document.getElementById('hammer-cooldown');
	var status = document.getElementById('hammer-status');
	var panel = status && status.parentNode;
	if (!player || !hearts || !ring || !status) return;

	if (dt && runState.hurtFlash > 0) {
		runState.hurtFlash = Math.max(0, runState.hurtFlash - dt);
	}
	if (player.health < lastHudHealth) runState.hurtFlash = 1.3;
	lastHudHealth = player.health;

	if (healthFill) healthFill.style.width = Math.max(0, Math.min(100, player.health / player.maxHealth * 100)) + '%';
	hearts.innerHTML = '';
	for (var i = 0; i < player.maxHealth; i++) {
		var heart = document.createElement('span');
		heart.className = 'heart' + (i < player.health ? '' : ' empty');
		heart.textContent = '♥';
		hearts.appendChild(heart);
	}
		var maxCooldown = 0.65;
	var ready = Math.max(0, Math.min(1, 1 - (player.hammerCooldown || 0) / maxCooldown));
	ring.style.setProperty('--cooldown', (ready * 100) + '%');
	status.textContent = ready >= 1 ? 'LISTO' : Math.ceil((player.hammerCooldown || 0) * 10) / 10 + 's';
	if (panel) panel.classList.toggle('cooling', ready < 1);

	// Intentos y progreso hacia el próximo intento extra.
	if (lastHudAttempts !== runState.attempts) {
		var attemptsEl = document.getElementById('attempts-count');
		var pips = document.getElementById('attempts-pips');
		if (attemptsEl) attemptsEl.textContent = runState.attempts;
		var attemptsWord = document.getElementById('attempts-word');
		if (attemptsWord) attemptsWord.textContent = runState.attempts === 1 ? 'INTENTO' : 'INTENTOS';
		if (pips) {
			pips.innerHTML = '';
			var shown = Math.min(5, runState.attempts);
			for (var p = 0; p < shown; p++) {
				var pip = document.createElement('span');
				pip.className = 'attempt-pip';
				pips.appendChild(pip);
			}
		}
		lastHudAttempts = runState.attempts;
	}
	if (lastHudProgress !== runState.killsSinceExtra) {
		var progressEl = document.getElementById('kill-progress');
		if (progressEl) progressEl.textContent = runState.killsSinceExtra + '/' + KO_FOR_ATTEMPT;
		lastHudProgress = runState.killsSinceExtra;
	}

	setMood(resolveMood());
}

// Devuelve 'fire' o 'shot' si hay un peligro del goblin cerca del jugador.
function hazardNearPlayer() {
	if (!player || player.dying) return null;
	var px = player.pos[0] + 8;
	var py = player.pos[1] + 8;
	var i, hazard;
	for (i = 0; i < fireAreas.length; i++) {
		hazard = fireAreas[i];
		if (!hazard || hazard.dead) continue;
		if (Math.abs(hazard.pos[0] + 18 - px) < 52 && Math.abs(hazard.pos[1] + 10 - py) < 40) return 'fire';
	}
	for (i = 0; i < goblinShots.length; i++) {
		hazard = goblinShots[i];
		if (!hazard || hazard.dead) continue;
		if (Math.abs(hazard.pos[0] + 8 - px) < 58 && Math.abs(hazard.pos[1] + 8 - py) < 48) return 'shot';
	}
	return null;
}

function resolveMood() {
	if (runState.cleared) return 'win';
	if (runState.over) return 'hurt';
	if (runState.hurtFlash > 0 || player.health <= 1) return 'hurt';
	if (hazardNearPlayer()) return 'danger';
	if (runState.reaction && gameTime < runState.reaction.until) return runState.reaction.mood;
	if (runState.attempts <= 1) return 'danger';
	return 'calm';
}

function moodLabel(mood) {
	var hazard = mood === 'danger' ? hazardNearPlayer() : null;
	if (hazard === 'fire') return '¡CUIDADO, FUEGO!';
	if (hazard === 'shot') return '¡MOLOTOV!';
	var reaction = runState.reaction;
	if (reaction && gameTime < reaction.until && reaction.mood === mood) return reaction.label;
	return (MOODS[mood] || MOODS.calm).label;
}

// Reacción temporal de la cabeza: cambia el ánimo y muestra una etiqueta.
function react(mood, label, seconds) {
	runState.reaction = {
		mood: mood,
		label: label,
		until: gameTime + (seconds || 1.6)
	};
}

function setMood(mood) {
	var info = MOODS[mood] || MOODS.calm;
	var face = document.getElementById('hud-face');
	var label = document.getElementById('hud-mood');
	var card = document.getElementById('hud-student');
	var nextLabel = moodLabel(mood);
	if (face && face.getAttribute('src') !== info.src) face.src = info.src;
	if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
	if (hudMood === mood) return;
	hudMood = mood;
	if (card) {
		card.classList.remove('mood-calm', 'mood-hurt', 'mood-danger', 'mood-win');
		card.classList.add('mood-' + mood);
		card.classList.remove('mood-pop');
		void card.offsetWidth;
		card.classList.add('mood-pop');
		if (hudPopTimeout) clearTimeout(hudPopTimeout);
		hudPopTimeout = setTimeout(function() { card.classList.remove('mood-pop'); }, 540);
	}
}

function showToast(text, kind) {
	var toast = document.getElementById('hud-toast');
	if (!toast) return;
	toast.textContent = text;
	toast.className = 'hud-toast show' + (kind ? ' ' + kind : '');
	if (toastTimeout) clearTimeout(toastTimeout);
	toastTimeout = setTimeout(function() {
		toast.className = 'hud-toast' + (kind ? ' ' + kind : '');
	}, 2200);
}

function showGameOver() {
	var overlay = document.getElementById('game-overlay');
	if (overlay) overlay.hidden = false;
}

function hideGameOver() {
	var overlay = document.getElementById('game-overlay');
	if (overlay) overlay.hidden = true;
}

// Un enemigo derrotado suma para el contador; cada 15 entrega un intento.
Mario.registerKill = function(enemy) {
	if (!enemy || enemy._killCounted) return;
	enemy._killCounted = true;
	runState.kills += 1;
	runState.killsSinceExtra += 1;
	if (runState.killsSinceExtra >= KO_FOR_ATTEMPT) {
		runState.killsSinceExtra -= KO_FOR_ATTEMPT;
		runState.attempts += 1;
		showToast('¡' + KO_FOR_ATTEMPT + ' KO! +1 INTENTO', 'extra');
		react('win', '¡INTENTO EXTRA!', 2.2);
		if (sounds && sounds.powerup) {
			sounds.powerup.currentTime = 0;
			sounds.powerup.play();
		}
	}
};

Mario.onCheckpoint = function(x, y) {
	if (runState.checkpoint) return;
	runState.checkpoint = { x: x, y: y };
	player.heal(player.maxHealth);
	showToast('CHECKPOINT · ESCUELA', 'checkpoint');
	react('win', '¡CHECKPOINT!', 2.2);
	if (sounds && sounds.powerup) {
		sounds.powerup.currentTime = 0;
		sounds.powerup.play();
	}
};

Mario.onLevelClear = function() {
	runState.cleared = true;
	showToast('¡BANDERA! NIVEL COMPLETADO', 'win');
	react('win', '¡BANDERA!', 2.5);
};

// Reacciones de Bruno a las situaciones del nivel.
Mario.onGoblinAttack = function() {
	react('danger', '¡MOLOTOV!', 1.4);
};

Mario.onGoblinHit = function() {
	react('win', '¡BUEN MARTILLAZO!', 1.2);
};

Mario.onPickup = function(kind) {
	if (kind === 'star') react('win', '¡ESTRELLA!', 2);
	else if (kind === 'fireflower') react('win', '¡VIDA EXTRA!', 1.7);
	else react('win', '¡VIDA RECUPERADA!', 1.5);
};

function attemptNotice(n) {
	return n === 1 ? 'QUEDA 1 INTENTO' : 'QUEDAN ' + n + ' INTENTOS';
}

// Muerte del jugador: descuenta un intento y reaparece en el checkpoint.
Mario.onPlayerDeath = function() {
	if (runState.over) return;
	runState.attempts = Math.max(0, runState.attempts - 1);
	runState.hurtFlash = 1.5;
	runState.reaction = null;

	if (runState.attempts <= 0) {
		runState.over = true;
		showGameOver();
		showToast('SIN INTENTOS', 'hurt');
		setTimeout(Mario.restartRun, 4200);
		return;
	}

	var checkpoint = runState.checkpoint;
	player = new Mario.Player(level.playerPos);
	Mario.oneone.call();
	input.reset();
	if (checkpoint) {
		player.pos = [checkpoint.x, checkpoint.y];
		vX = Math.max(0, checkpoint.x - 80);
		showToast('CHECKPOINT · ' + attemptNotice(runState.attempts), 'checkpoint');
	} else {
		showToast(attemptNotice(runState.attempts), 'hurt');
	}
};

// Al volver a empezar después de la bandera, el recorrido arranca limpio.
Mario.onLevelRestart = function() {
	runState.attempts = 3;
	runState.kills = 0;
	runState.killsSinceExtra = 0;
	runState.checkpoint = null;
	runState.cleared = false;
	runState.over = false;
	runState.hurtFlash = 0;
	runState.reaction = null;
	hudMood = '';
	player.maxHealth = 3;
	player.health = 3;
	player.coins = 0;
	lastHudHealth = player.health;
	lastHudAttempts = -1;
	lastHudProgress = -1;
	hideGameOver();
};

// Reinicio completo cuando se acaban los intentos.
Mario.restartRun = function() {
	if (!runState.over) return;
	runState.attempts = 3;
	runState.kills = 0;
	runState.killsSinceExtra = 0;
	runState.checkpoint = null;
	runState.cleared = false;
	runState.over = false;
	runState.hurtFlash = 0;
	runState.reaction = null;
	hudMood = '';
	lastHudAttempts = -1;
	lastHudProgress = -1;
	hideGameOver();
	player = new Mario.Player(level.playerPos);
	Mario.oneone.call();
	vX = 0;
	input.reset();
	lastHudHealth = player.health;
	showToast('NUEVO RECREO · 3 INTENTOS', 'checkpoint');
};

function handleInput(dt) {
  if (runState.over || player.piping || player.dying || player.noInput) return; //don't accept input

	if (input.consumeAttack()) player.meleeAttack();
  if (input.isDown('JUMP')) {
    player.jump();
  } else {
    //we need this to handle the timing for how long you hold it
    player.noJump();
  }

  if (input.isDown('DOWN')) {
    player.crouch();
  } else {
    player.noCrouch();
  }

  if (input.isDown('LEFT')) { // 'd' or left arrow
    player.moveLeft();
  }
  else if (input.isDown('RIGHT')) { // 'k' or right arrow
    player.moveRight();
  } else {
    player.noWalk();
  }
}

//update all the moving stuff
function updateEntities(dt, gameTime) {
  player.update(dt, vX);
  updateables.forEach (function(ent) {
    ent.update(dt, gameTime);
  });

  //This should stop the jump when he switches sides on the flag.
  if (player.exiting) {
    if (player.pos[0] > vX + 96)
      vX = player.pos[0] - 96
  }else if (level.scrolling && player.pos[0] > vX + 80) {
    vX = player.pos[0] - 80;
  }

  if (player.powering.length !== 0 || player.dying) { return; }
  level.items.forEach (function(ent) {
    ent.update(dt);
  });

  level.enemies.forEach (function(ent) {
    ent.update(dt, vX);
  });

	  fireballs.forEach(function(fireball) {
	    fireball.update(dt);
	  });
  goblinShots.forEach(function(shot) {
    shot.update(dt, vX);
  });
  fireAreas.forEach(function(fire) {
    fire.update(dt);
  });
  level.pipes.forEach (function(pipe) {
    pipe.update(dt);
  });
}

//scan for collisions
function checkCollisions() {
  if (player.powering.length !== 0 || player.dying) { return; }
  player.checkCollisions();

  //Apparently for each will just skip indices where things were deleted.
  level.items.forEach(function(item) {
    item.checkCollisions();
  });
  level.enemies.forEach (function(ent) {
    ent.checkCollisions();
  });
	  fireballs.forEach(function(fireball){
	    fireball.checkCollisions();
	  });
  goblinShots.forEach(function(shot) {
    shot.checkCollisions();
  });
  fireAreas.forEach(function(fire) {
    fire.checkCollisions();
  });
  level.pipes.forEach (function(pipe) {
    pipe.checkCollisions();
  });
}

//draw the game!
function render() {
  updateables = [];
  // The context is scaled 3x, so clearing the logical playfield is enough.
  ctx.clearRect(0, 0, 256, 240);
  renderSchoolBackground();

  //scenery gets drawn first to get layering right.
  for(var i = 0; i < 15; i++) {
    for (var j = Math.floor(vX / 16) - 1; j < Math.floor(vX / 16) + 20; j++){
      if (level.scenery[i][j]) {
        renderEntity(level.scenery[i][j]);
      }
    }
  }

  //then items
  level.items.forEach (function (item) {
    renderEntity(item);
  });

  level.enemies.forEach (function(enemy) {
    renderEntity(enemy);
  });



		  fireballs.forEach(function(fireball) {
		    renderEntity(fireball);
		  });

  //then we draw every static object.
  for(var i = 0; i < 15; i++) {
    for (var j = Math.floor(vX / 16) - 1; j < Math.floor(vX / 16) + 20; j++){
      if (level.statics[i][j]) {
        renderEntity(level.statics[i][j]);
      }
      if (level.blocks[i][j]) {
        renderEntity(level.blocks[i][j]);
        updateables.push(level.blocks[i][j]);
      }
    }
  }

  //proyectiles y fuego del goblin, por encima del terreno
  goblinShots.forEach(function(shot) {
    renderEntity(shot);
  });
  fireAreas.forEach(function(fire) {
    renderEntity(fire);
  });

  //then the player
  if (Math.floor(player.invincibility) % 2 === 0) {
    renderEntity(player);
  }

  //Mario goes INTO pipes, so naturally they go after.
  level.pipes.forEach (function(pipe) {
    renderEntity(pipe);
  });
}

// The original 256x240 playfield is preserved; school photos sit behind it.
// Around the horizontal midpoint the two existing backgrounds crossfade.
function renderSchoolBackground() {
  var first = cachedSchoolBackgrounds.first;
  var second = cachedSchoolBackgrounds.second;
  var midpoint = (level.exit * 16) / 2;
  var fade = 64;
  var mix = Math.max(0, Math.min(1, (vX - (midpoint - fade)) / (fade * 2)));
  ctx.save();
  if (first) ctx.drawImage(first, 0, 0);
  if (second) {
    ctx.globalAlpha = mix;
    ctx.drawImage(second, 0, 0);
  }
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#10172b';
  ctx.fillRect(0, 0, 256, 240);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = mix > 0.5 ? '#edf4ef' : '#233b50';
  ctx.fillRect(0, 0, 256, 3);
  ctx.restore();
}

function prepareSchoolBackgrounds() {
  [
    ['first', schoolBackgrounds.first],
    ['second', schoolBackgrounds.second]
  ].forEach(function(entry) {
    var image = resources.get(entry[1]);
    if (!image) return;
    var layer = document.createElement('canvas');
    layer.width = 256; layer.height = 240;
    var layerCtx = layer.getContext('2d');
    layerCtx.imageSmoothingEnabled = false;
    layerCtx.drawImage(image, 0, 0, image.width, image.height, 0, 0, 256, 240);
    cachedSchoolBackgrounds[entry[0]] = layer;
  });
}

function renderEntity(entity) {
  entity.render(ctx, vX, vY);
}
