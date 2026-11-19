var oneone = Mario.oneone = function() {
  //The things that need to be passed in are basically just dependent on what
  //tileset we're in, so it makes more sense to just make one variable for that, so
  //TODO: put as much of this in the Level object definition as possible.
  var schoolTiles = 'src/hojaDeSprites/tilesetExterior.png';
  var interiorTiles = 'src/hojaDeSprites/tilesetEscolar.png';
  var schoolSprite = function(x, y, w, h, destW, destH) {
    var sprite = new Mario.Sprite(schoolTiles, [0,0], [destW || Math.max(16, Math.round(w / 4)), destH || Math.max(16, Math.round(h / 4))], 0, [0]);
    sprite.frameRects = [[x, y, w, h]];
    sprite.alternateImg = interiorTiles;
    sprite.alternateFrameRects = [[x, y, w, h]];
    sprite.phaseX = 1632;
    return sprite;
  };
  var hammerPickupSprite = function() {
    var sprite = new Mario.Sprite('src/hojaDeSprites/clown-animations.png', [64,280], [24,32], 0, [0]);
    sprite.frameRects = [[64,280,32,40]];
    return sprite;
  };

  // Checkpoint: el cartel de "ESCUELA" funciona como punto de reaparición.
  var checkpointSprite = new Mario.Sprite('src/tiles/frames/exterior/exterior_53.png', [0,0], [64,30], 0, [0]);
  checkpointSprite.frameRects = [[0,0,256,120]];

  // Bandera final: solo el png, con su propio mástil y base incluidos.
  var goalFlagSprite = new Mario.Sprite('src/tiles/frames/exterior/exterior_14.png', [0,0], [42,65], 0, [0]);
  goalFlagSprite.frameRects = [[0,0,134,208]];

  level = new Mario.Level({
    playerPos: [56,192],
    loader: Mario.oneone,
    background: "#203957",
    scrolling: true,
    invincibility: [144, 192, 240],
    exit: 422,
	    floorSprite:  new Mario.Sprite('sprites/tiles.png', [0,32], [16,16], 0),
    cloudSprite: schoolSprite(1095, 850, 150, 135, 48, 32),
	    wallSprite: new Mario.Sprite('sprites/tiles.png', [32,32], [16,16], 0),
	    brickSprite: new Mario.Sprite('sprites/tiles.png', [16,0], [16,16], 0),
	    brickBounceSprite: new Mario.Sprite('sprites/tiles.png', [32,0], [16,16], 0),
    rubbleSprite: function () {
      return new Mario.Sprite('sprites/items.png', [64,0], [8,8], 3, [0,1]);
    },
	    ublockSprite: new Mario.Sprite('sprites/tiles.png', [48,0], [16,16], 0),
    superShroomSprite: new Mario.Sprite('sprites/items.png', [0,0], [16,16], 0),
    fireFlowerSprite: hammerPickupSprite(),
    starSprite: new Mario.Sprite('sprites/items.png', [0,48], [16,16], 20, [0,1,2,3]),
    pipeLEndSprite: new Mario.Sprite('sprites/tiles.png', [0,128], [16,16], 0),
    pipeREndSprite: new Mario.Sprite('sprites/tiles.png', [16,128], [16,16], 0),
    pipeLMidSprite: new Mario.Sprite('sprites/tiles.png', [0,144], [16,16], 0),
    pipeRMidSprite: new Mario.Sprite('sprites/tiles.png', [16,144], [16,16], 0),

    pipeUpMid: new Mario.Sprite('sprites/tiles.png', [0,144], [32,16], 0),
    pipeSideMid: new Mario.Sprite('sprites/tiles.png', [48,128], [16,32], 0),
    pipeLeft: new Mario.Sprite('sprites/tiles.png', [32,128], [16,32], 0),
    pipeTop: new Mario.Sprite('sprites/tiles.png', [0,128], [32,16], 0),
    qblockSprite: new Mario.Sprite('sprites/tiles.png', [384,0], [16,16], 8, [0,0,0,0,1,2,1]),
    coinSprite: function() {
      return new Mario.Sprite('sprites/items.png', [0,96], [16,16], 6, [0,0,0,0,1,2,1]);
    },
    bcoinSprite: function() {
      return new Mario.Sprite('sprites/items.png', [0,96], [16,16], 6, [0,0,0,0,1,2,1]);
    },
    cloudSprites:[
      schoolSprite(1080, 850, 150, 135, 16, 32),
      schoolSprite(1240, 850, 150, 135, 16, 32),
      schoolSprite(1400, 850, 120, 135, 16, 32)
    ],
    hillSprites: [schoolSprite(0,205,130,170,32,32), schoolSprite(0,205,130,170,32,32), schoolSprite(0,205,130,170,32,32), schoolSprite(0,205,130,170,32,32), schoolSprite(0,205,130,170,32,32), schoolSprite(0,205,130,170,32,32)],
    bushSprite: schoolSprite(0,865,130,115,32,28),
    bushSprites: [
     schoolSprite(0,865,130,115,16,16), schoolSprite(0,865,130,115,16,16), schoolSprite(0,865,130,115,16,16)],
   goombaSprite: function() {
     return new Mario.Sprite('sprites/enemy.png', [0,16], [16,16], 3, [0,1]);
   },
   koopaSprite: function() {
     return new Mario.Sprite('sprites/enemy.png', [96,0], [16,32], 2, [0,1]);
   }
 });

  // Al recargar el nivel, descartamos proyectiles y fuegos del nivel anterior.
  Mario.goblinShots.length = 0;
  Mario.fireAreas.length = 0;

  // Nivel al doble de largo. Dos mitades bien distintas:
  //   0-210   → exterior simple, con colinas, bloques y tuberías.
  //   210-428 → pasillos escolares, techos bajos y secciones de salto.
  ground = [
    [0,70], [72,122], [124,210],
    [210,252], [254,260], [262,318], [320,338], [340,366], [368,374], [376,428]
  ];
  player.pos[0] = level.playerPos[0];
  player.pos[1] = level.playerPos[1];
  vX = 0;

  //build THE GROUND
  ground.forEach(function(loc) {
    level.putFloor(loc[0],loc[1]);
  });

  //build scenery
  // Props escolares apoyados en el suelo, nunca flotando en la capa de cielo.
  [18, 36, 66, 86, 110, 144, 176, 198, 218, 242, 258, 276, 300, 330, 344, 358, 368, 384, 402, 410].forEach(function(prop) {
    level.putBush(prop, 12);
  });

  // ---------------------------------------------------------------------
  // PRIMERA MITAD: plataformeo simple y amable.
  // ---------------------------------------------------------------------
  level.putBrick(7, 9, null);
  level.putQBlock(8, 9, new Mario.Mushroom([128, 144]));
  level.putBrick(9, 9, null);
  level.putQBlock(12, 9, new Mario.Bcoin([192, 144]));
  level.putBrick(13, 9, null);

  level.putPipe(22, 13, 2);

  level.putBrick(32, 9, null);
  level.putQBlock(33, 9, new Mario.Bcoin([528, 144]));
  level.putBrick(34, 9, null);
  level.putQBlock(35, 5, new Mario.Bcoin([560, 80]));

  // Escalera clásica.
  [[42,1],[43,2],[44,3],[45,4],[46,4],[47,3],[48,2],[49,1]].forEach(function(step) {
    level.putWall(step[0], 13, step[1]);
  });

  // Monedas sobre los escalones.
  [44, 45, 46, 47].forEach(function(x) { level.putCoin(x, 7); });

  // Monedas que guían el primer salto.
  level.putCoin(70, 9);
  level.putCoin(71, 9);

  level.putBrick(74, 9, null);
  level.putQBlock(75, 9, new Mario.Bcoin([1200, 144]));
  level.putBrick(76, 9, null);
  level.putCoin(75, 8);
  level.putCoin(76, 8);
  level.putQBlock(78, 9, new Mario.Mushroom([1248, 144]));
  level.putBrick(79, 9, null);

  // Tubería real: entrada al túnel escolar (segunda etapa).
  level.putRealPipe(96, 10, 3, "DOWN", Mario.oneonetunnel);

  level.putBrick(104, 9, null);
  level.putQBlock(105, 9, new Mario.Bcoin([1680, 144]));
  level.putBrick(106, 9, null);
  level.putQBlock(106, 5, new Mario.Bcoin([1696, 80]));
  level.putBrick(107, 5, null);

  // Tubería de salida del túnel (el jugador vuelve aquí).
  level.putPipe(126, 13, 2);
  [130, 131, 132, 133, 134].forEach(function(x) { level.putCoin(x, 11); });

  level.putBrick(138, 9, null);
  level.putQBlock(139, 9, new Mario.Bcoin([2224, 144]));
  level.putBrick(140, 9, null);

  // Monedas y respiro antes de la segunda torreta.
  [158, 159, 160].forEach(function(x) { level.putCoin(x, 11); });

  level.putBrick(164, 9, null);
  level.putQBlock(165, 9, new Mario.Bcoin([2640, 144]));
  level.putBrick(166, 9, null);

  level.putBrick(172, 9, null);
  level.putQBlock(173, 9, new Mario.Mushroom([2768, 144]));
  level.putBrick(174, 9, null);
  [179, 180, 181].forEach(function(x) { level.putCoin(x, 11); });

  level.putCoin(200, 11);

  // Checkpoint a mitad de nivel: cartel "ESCUELA".
  level.scenery[12][202] = new Mario.Prop([202 * 16, 178], checkpointSprite);
  level.checkpointX = 202 * 16;
  level.checkpointRespawn = [207 * 16, 192];

  // ---------------------------------------------------------------------
  // SEGUNDA MITAD: pasillos con techos, columnas y saltos.
  // ---------------------------------------------------------------------

  // Pasillo 1: techo bajo continuo de 212 a 226.
  for (var c1 = 212; c1 <= 226; c1++) level.putWall(c1, 10, 1);
  [214, 216, 218, 220, 222, 224].forEach(function(x) { level.putCoin(x, 11); });

  // Monedas sobre el primer hueco.
  level.putCoin(252, 9);
  level.putCoin(253, 9);
  [256, 257].forEach(function(x) { level.putCoin(x, 11); });

  // Monedas sobre el segundo hueco.
  level.putCoin(260, 9);
  level.putCoin(261, 9);

  // Pasillo 2: techo bajo de 266 a 282.
  for (var c2 = 266; c2 <= 282; c2++) level.putWall(c2, 10, 1);
  [268, 270, 272, 274, 276, 278, 280].forEach(function(x) { level.putCoin(x, 11); });

  // Plataformas flotantes de la sección de salto.
  level.putBrick(308, 10, null);
  level.putBrick(309, 10, null);
  level.putBrick(312, 10, null);
  level.putBrick(313, 10, null);
  [308, 309, 312, 313].forEach(function(x) { level.putCoin(x, 9); });

  // Monedas sobre el tercer hueco.
  level.putCoin(318, 9);
  level.putCoin(319, 9);

  // Pasillo 3: techo bajo de 322 a 336.
  for (var c3 = 322; c3 <= 336; c3++) level.putWall(c3, 10, 1);
  [324, 326, 328, 330, 332, 334].forEach(function(x) { level.putCoin(x, 11); });

  // Monedas sobre el cuarto hueco.
  level.putCoin(338, 9);
  level.putCoin(339, 9);

  // Monedas sobre el quinto hueco.
  level.putCoin(366, 9);
  level.putCoin(367, 9);
  level.putCoin(370, 11);
  level.putCoin(374, 9);
  level.putCoin(375, 9);

  // Pasillo final: techo bajo de 378 a 392.
  for (var c4 = 378; c4 <= 392; c4++) level.putWall(c4, 10, 1);
  [380, 382, 384, 386, 388, 390].forEach(function(x) { level.putCoin(x, 11); });

  // Remate final: escaloncitos y recompensa antes de la bandera.
  [[400,1],[401,2],[402,3],[403,2],[404,1]].forEach(function(step) {
    level.putWall(step[0], 13, step[1]);
  });
  level.putBrick(396, 9, null);
  level.putQBlock(397, 9, new Mario.Star([6352, 144]));
  level.putBrick(398, 9, null);

  [408, 409, 410].forEach(function(x) { level.putCoin(x, 11); });

  // Bandera final: el png completo apoyado en el suelo, sin bloque ni mástil
  // adicionales. La entidad Flag solo detecta la llegada del jugador.
  level.scenery[12][416] = new Mario.Prop([416 * 16, 208 - 65], goalFlagSprite);
  level.items.push(new Mario.Flag(416 * 16));

  // ---------------------------------------------------------------------
  // ENEMIGOS
  // Las torretas goblin quedan aisladas: ningún goomba ni koopa a menos de
  // ocho tiles de su columna. Las zonas 56-64, 144-158, 188-202, 228-242,
  // 288-302 y 344-358 están despejadas a propósito.
  // ---------------------------------------------------------------------
  level.putGoomba(15, 12);
  level.putGoomba(27, 12);
  level.putGoomba(38, 12);
  level.putGoomba(50, 12);

  level.putGoomba(78, 12);
  level.putGoomba(84, 12);
  level.putKoopa(88, 11);

  level.putGoomba(102, 12);
  level.putGoomba(110, 12);
  level.putKoopa(114, 11);

  level.putGoomba(166, 12);
  level.putGoomba(170, 12);
  level.putKoopa(174, 11);

  level.putGoomba(216, 12);
  level.putKoopa(221, 11);

  level.putGoomba(250, 12);
  level.putGoomba(257, 12);

  level.putGoomba(272, 12);
  level.putGoomba(280, 12);
  level.putKoopa(283, 11);

  level.putGoomba(310, 12);
  level.putGoomba(316, 12);

  level.putGoomba(326, 12);
  level.putKoopa(332, 11);
  level.putGoomba(336, 12);

  level.putGoomba(364, 12);
  level.putGoomba(370, 12);
  level.putGoomba(382, 12);
  level.putGoomba(388, 12);
  level.putKoopa(390, 11);

  level.putGoomba(396, 12);
  level.putGoomba(406, 12);

  // ---------------------------------------------------------------------
  // TORRETAS GOBLIN
  // Cada una tiene su propia escalera para poder acercarse y usar el martillo.
  // A: 4 tiles de alto.  B, D, E y F: 5 tiles.  C: 4 tiles.
  // ---------------------------------------------------------------------
  // Torreta A (primera mitad).
  level.putWall(56, 13, 1);
  level.putWall(57, 13, 2);
  level.putWall(58, 13, 3);
  level.putWall(59, 13, 4);
  level.putWall(60, 13, 4);
  level.putGoblin(60, 8);

  // Torreta B.
  level.putWall(146, 13, 1);
  level.putWall(147, 13, 2);
  level.putWall(148, 13, 3);
  level.putWall(149, 13, 4);
  level.putWall(150, 13, 5);
  level.putWall(151, 13, 5);
  level.putGoblin(151, 7);

  // Torreta C, antes del checkpoint.
  level.putWall(190, 13, 1);
  level.putWall(191, 13, 2);
  level.putWall(192, 13, 3);
  level.putWall(193, 13, 4);
  level.putWall(194, 13, 4);
  level.putWall(195, 13, 4);
  level.putGoblin(195, 8);

  // Torreta D (primer pasillo).
  level.putWall(230, 13, 1);
  level.putWall(231, 13, 2);
  level.putWall(232, 13, 3);
  level.putWall(233, 13, 4);
  level.putWall(234, 13, 5);
  level.putWall(235, 13, 5);
  level.putGoblin(235, 7);

  // Torreta E (segundo pasillo).
  level.putWall(290, 13, 1);
  level.putWall(291, 13, 2);
  level.putWall(292, 13, 3);
  level.putWall(293, 13, 4);
  level.putWall(294, 13, 5);
  level.putWall(295, 13, 5);
  level.putGoblin(295, 7);

  // Torreta F (recta final).
  level.putWall(346, 13, 1);
  level.putWall(347, 13, 2);
  level.putWall(348, 13, 3);
  level.putWall(349, 13, 4);
  level.putWall(350, 13, 5);
  level.putWall(351, 13, 5);
  level.putGoblin(351, 7);

  music.underground.pause();
  // music.overworld.currentTime = 0;
  music.overworld.play();
};
