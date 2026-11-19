# Informe: Construcción del Nivel 1 (World 1-1) — "Recreo Pixelado"

## 1. Resumen general

El primer nivel (definido en `mario-gh-pages/js/levels/11.js`, función `Mario.oneone`) es un nivel de plataformas de desplazamiento horizontal (scrolling) inspirado en el World 1-1 de Super Mario Bros., retematizado con estética escolar. Se construye sobre una cuadrícula de tiles de 16×16 px, con 15 filas verticales (0–14) y ~212 columnas horizontales. El jugador inicia en `[56, 192]` (cerca del borde izquierdo) y el nivel termina en la bandera (tile 198), con salida en el tile 204.

---

## 2. Estructura del terreno (suelo)

El suelo se coloca con `putFloor(start, end)`, que rellena las filas 13 y 14 (superficie y base) con tiles de suelo. Se definen 4 segmentos separados por huecos (pits):

| Segmento (tiles) | Descripción |
|---|---|
| 0 – 69 | Suelo inicial continuo |
| 71 – 86 | Primer hueco en el tile 70 |
| 89 – 153 | Hueco de 2 tiles (87–88) |
| 155 – 212 | Hueco de 1 tile (154) |

**Huecos (pits):** tiles 70, 87–88 y 154. Caer en ellos mata al jugador.

---

## 3. Escenario (scenery, capa decorativa)

- **Arbustos (`putBush`)** en la fila 12 (y=192), apoyados sobre el suelo: tiles 18, 46, 74, 104, 146, 174.
- **Nubes, colinas, arbustos grandes** se definen como sprites del tileset escolar (`schoolSprite`) con dimensiones dest (16×32, 32×32, etc.), alternando entre tileset exterior e interior según `phaseX = 1632` (cambio de paleta al entrar al interior).

---

## 4. Elementos interactivos (blocks, pipes, walls)

### Bloques y ladrillos (filas 5 y 9)
- **Fila 9 (y=144):** bloques Q y ladrillos con power-ups (monedas, seta, estrella) y monedas ocultas.
  - Tile 16: QBlock → moneda oculta (Bcoin)
  - Tiles 20,22,24: ladrillos (22 con seta en QBlock arriba)
  - Tile 21: QBlock → seta
  - Tile 22 (fila 5): QBlock → moneda (bloque alto)
  - Tile 23: QBlock → moneda
  - Tile 77–79: ladrillo, QBlock → seta, ladrillo
  - Tiles 80–87 (fila 5): fila de 8 ladrillos
  - Tiles 91–93 (fila 5): 3 ladrillos
  - Tile 94 (fila 5): QBlock → moneda; tile 94 (fila 9): ladrillo
  - Tile 100 (fila 9): ladrillo con estrella; tile 101: ladrillo
  - Tiles 105, 108, 111 (fila 9): QBlock → moneda
  - Tile 108 (fila 5): QBlock → seta
  - Tile 117 (fila 9): ladrillo
  - Tiles 120–123 (fila 5): 4 ladrillos
  - Tiles 128–131 (fila 5): ladrillo, QBlock×2 (monedas), ladrillo; (fila 9): ladrillo, ladrillo
- **Muros/escaleras (walls):** tiles 134–137 (alturas 1,2,3,4), 140–143 (4,3,2,1) forman un valle entre dos escaleras; tiles 148–152 y 155–158 forman otra pareja de escaleras; tiles 181–189 forman una escalera alta (1,2,3,4,5,6,7,8,8) que lleva a la bandera.

### Tuberías (pipes)
- Tile 28, fila 13, altura 2 (tubería corta)
- Tile 38, fila 13, altura 3
- Tile 46, fila 13, altura 4
- Tile 57, fila 9, altura 4: **tubería de teletransporte** (`putRealPipe`) con dirección DOWN hacia `Mario.oneonetunnel` (nivel subterráneo). Al entrar, el jugador es enviado al túnel y regresa por una tubería al tile ~163.
- Tile 163, fila 13, altura 2
- Tile 179, fila 13, altura 2

### Bandera (flagpole)
- Tile 198: `putFlagpole(198)` — base en fila 12, poste en filas 2–11, bandera en fila 2, item `Mario.Flag`.

---

## 5. Enemigos

| Tipo | Posición (tile x, tile y) | Cantidad |
|---|---|---|
| Goomba | (22,12), (40,12), (50,12), (51,12), (100,12), (102,12), (114,12), (115,12), (122,12), (123,12), (125,12), (126,12), (170,12), (172,12) | 14 |
| Goomba (en plataforma alta) | (82,4), (84,4) | 2 |
| Koopa | (35,11) | 1 |

Total: 16 Goombas + 1 Koopa = 17 enemigos.

---

## 6. Power-ups y items

- Setas (Mushroom): tiles 21, 78, 108 (fila 5).
- Estrella (Star): tile 100 (fila 9).
- Monedas ocultas (Bcoin en QBlock): tiles 16, 22 (fila5), 23, 94 (fila5), 105, 108, 111, 129 (fila5), 130 (fila5), 170.
- Monedas sueltas: ninguna (solo en bloques).
- Invencibilidad (star): tiles [144, 192, 240] (parámetro `invincibility`).

---

## 7. Nivel subterráneo (túnel) — `11tunnel.js`

- **Tipo:** interior no-scrolling (una pantalla de 16×13 tiles).
- **Fondo:** `#10263b` (azul oscuro), música underground.
- **Jugador inicia:** `[40, 16]` (tile 2.5, 1).
- **Suelo:** `putFloor(0, 16)` (toda la fila inferior).
- **Paredes:** x=0 altura 11 (pared izquierda); x=4–10 con paredes de altura 3 en la base y altura 1 en el techo (creando huecos/pasajes).
- **Monedas:** grilla de 17 monedas en filas 5, 7 y 9 (tiles 4–10).
- **Salida:** tubería en (13,11) altura 3, dirección RIGHT, teletransporta a `Mario.oneone` con `player.pos = [2616, 177]` (cerca del tile 163, donde está la otra tubería del nivel principal) y ejecuta `player.pipe('UP', ...)`.

---

## 8. Flujo de juego

1. El jugador aparece en el tile 3.5 (x=56) sobre el suelo inicial.
2. Avanza hacia la derecha recolectando monedas, setas y la estrella.
3. Puede entrar a la tubería del tile 57 para ir al túnel subterráneo, recolectar monedas y salir por la tubería del tile 13 del túnel (regresa al tile ~163 del nivel principal).
4. Supera las escaleras (tiles 134–189) y llega a la bandera (tile 198) para completar el nivel.

---

## 9. Respuesta a la pregunta sobre sprites

**¿Sería más fácil con una imagen por frame en vez de una hoja?**

- **Hoja de sprites (actual):** un solo archivo, menos peticiones HTTP, menos memoria, y el motor ya está diseñado para ello (`sprite.js` usa `frameRects` por animación). La desventaja es que hay que medir coordenadas (rects) a mano.
- **Una imagen por frame:** más fácil de editar (sin medir rects) y de depurar visualmente, pero requiere cambios en el motor (cargar N imágenes, manejarlas por frame), más archivos y más memoria. Además, el escalado/anclaje por animación (`frameScale`) tendría que adaptarse.

Para este proyecto, la hoja es la opción adecuada. Si en el futuro se agregan muchos frames nuevos o se rediseñan sprites con frecuencia, migrar a imágenes individuales (o a un atlas generado con herramienta) podría valer la pena, pero implicaría refactorizar `sprite.js` y `player.js`. Lo ideal sería usar una herramienta de atlas (TexturePacker) que genere el JSON de rects automáticamente, manteniendo una sola imagen.

---

## 10. Archivos relevantes

- `mario-gh-pages/js/levels/11.js` — definición del nivel principal.
- `mario-gh-pages/js/levels/11tunnel.js` — nivel subterráneo.
- `mario-gh-pages/js/levels/level.js` — clase `Level` y helpers (`putFloor`, `putPipe`, `putQBlock`, `putBrick`, `putWall`, `putFlagpole`, etc.).
- `mario-gh-pages/js/game.js` — carga de recursos y bucle principal.
- `mario-gh-pages/js/player.js` — jugador (Bruno) y sus animaciones.
- `mario-gh-pages/src/Player/HojaSpritesDF.png` — hoja de sprites del jugador.
- `mario-gh-pages/src/tiles/tilesetExterior.png` / `tilesetEscolar.png` — tilesets del nivel.