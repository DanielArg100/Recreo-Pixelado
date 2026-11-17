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
var player = new Mario.Player([0,0]);
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
	  'src/Player/HojaSpritesDF.png?v=2',
  'src/tiles/tilesetExterior.png',
  'src/tiles/tilesetEscolar.png',
  'src/tiles/school-flag.png',
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

  handleInput(dt);
  updateEntities(dt, gameTime);

	checkCollisions();
	updateGameHud();
}

function updateGameHud() {
	var hearts = document.getElementById('health-hearts');
	var healthFill = document.getElementById('health-fill');
	var ring = document.getElementById('hammer-cooldown');
	var status = document.getElementById('hammer-status');
	var panel = status && status.parentNode;
	if (!player || !hearts || !ring || !status) return;
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
}

function handleInput(dt) {
  if (player.piping || player.dying || player.noInput) return; //don't accept input

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

  //then the player
  if (player.invincibility % 2 === 0) {
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
