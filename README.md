# 🧉 Recreo Pixelado — Expotécnica

> Proyecto escolar desarrollado para la **Expotécnica** de **6°3**, en la materia **Laboratorio de Diseño Web** de la **E.E.S.T N°1 "Cecilia Berdichevsky"**.

## 📖 Sobre el proyecto

**Recreo Pixelado** es un sitio web dedicado a un videojuego de plataformas propio: controlás a **Bruno, un payaso triste**, que recorre la escuela durante el recreo. Todo transcurre en la **E.E.S.T N°1 "Cecilia Berdichevsky"**: el patio, los pasillos y las aulas son el escenario del juego.

El sitio combina contenido informativo (inicio, historia, controles y sobre el proyecto) con una versión jugable directamente en el navegador. El juego se construyó a partir del proyecto **Full Screen Mario**, sobre el cual se hicieron modificaciones y adaptaciones propias, y toma como referencia el **Super Mario Bros. original** de Nintendo.

Uno de los objetivos principales fue no limitarse a mostrar el juego original, sino crear una **experiencia propia** con un nivel personalizado de dos etapas y mecánicas nuevas.

## 🎮 Características

- 🌐 Sitio web completo: inicio rediseñado, historia, controles y proyecto.
- 🕹️ Juego jugable en el navegador, en **dos etapas**, con checkpoint y bandera.
- 🔨 **Martillo** con alcance base de 24 px, golpe simétrico a ambos lados y refuerzo temporal de +12 px.
- 🧉 **Mate**: los enemigos y los bloques rotos con el martillo sueltan material con 25% de probabilidad; se guardan hasta 2 y se ceban con **M**.
- 🎲 **13 efectos aleatorios** con HUD de cuenta regresiva: salto, vida, intentos, velocidad, martillo, mareo, alucinaciones y controles invertidos, entre otros.
- ★ **Estrellas y símbolos en pantalla** durante el mareo y las alucinaciones.
- 🤡 **Enemigos goofy**: goombas y koopas con ocurrencias aleatorias y globos de texto.
- 💻 Funcionamiento directo desde la web, sin instalar nada.

## 🧉 El mate

Al vencer enemigos o romper bloques con el martillo aparece material para el mate (`Mario.MATE_DROP_CHANCE = 0.25`). El ítem queda quieto, aparece con una animación breve y se puede levantar recién después de 1 segundo. Aparece el aviso **"MATERIAL PARA EL MATE OBTENIDO"**.

La matetera del HUD guarda **hasta 2** mates. Con **M** se ceba uno y se aplica uno de los **13 efectos** definidos en `Mario.MATE_EFFECTS`:

| Efecto | Tipo | Duración |
|---|---|---|
| ¡Saltarás más! | extra | 14 s |
| ¡Te curaste! | premio | instantáneo |
| ¡El mate te pegó! | castigo | instantáneo |
| +1 vida máxima / -1 vida máxima | variable | permanente en la partida |
| +1 intento / -1 intento | variable | instantáneo |
| Más rápido / Más lento | variable | 14 s |
| Martillo más largo | extra | permanente en la partida |
| ¡Estás mareo! | castigo | 8 s |
| ¡Alucinando! | extra | 10 s |
| Controles invertidos | castigo | 12 s |

El panel **EFECTO ACTIVO** del HUD muestra cuánto falta para que terminen los efectos temporales.

## 🕹️ Controles

| Tecla | Acción |
|---|---|
| **W** / **X** | Saltar (mantener = salto más alto) |
| **A** / **←** | Mover a la izquierda |
| **D** / **→** | Mover a la derecha |
| **S** / **↓** | Agacharse |
| **E** / clic izquierdo | Martillo (recarga de 0,65 s) |
| **M** | Cebar un mate guardado |

Bruno corre automáticamente; no hay tecla de correr. **↑**, **Espacio** y **Enter** no tienen función.

## 🧩 Nivel personalizado

El nivel usa la estructura de Full Screen Mario pero modifica la distribución del escenario, plataformas, enemigos, obstáculos, tuberías, bloques, objetos y dificultad. Tiene dos etapas (exterior y pasillos), un cartel de ESCUELA como checkpoint, torretas goblin y la bandera de salida. Los goombas y koopas hacen ocurrencias graciosas (siesta, trompo, corrida, patinada, reverencia, mirada y paso atrás) sin alterar daño ni puntaje.

## 🛠️ Tecnologías utilizadas

- **HTML5** — estructura de las páginas.
- **CSS3** — diseño del sitio, HUD y overlay de efectos.
- **JavaScript** — lógica del juego, drop del mate y efectos aleatorios.
- **Canvas** — renderizado del videojuego.

## 📚 Proyecto base

Se usa como referencia y base de desarrollo **Full Screen Mario**, un proyecto web que recrea Super Mario Bros. con HTML, CSS y JavaScript.

> ⚠️ **Importante:** Full Screen Mario no fue desarrollado originalmente por nuestro equipo. Este proyecto parte de ese trabajo como base y agrega modificaciones propias para la Expotécnica.

## 🎓 Contexto académico

**Institución:** E.E.S.T N°1 "Cecilia Berdichevsky"  
**Curso:** 6°3  
**Materia:** Laboratorio de Diseño Web  
**Profesor:** Pablo Gareis 🐍  
**Proyecto:** Recreo Pixelado — sitio web y videojuego

## ❤️ Créditos

Proyecto realizado con fines **educativos y escolares** para la Expotécnica. **Super Mario Bros.** es propiedad intelectual de **Nintendo**; este proyecto escolar no reclama propiedad sobre el videojuego, sus personajes ni sus elementos originales.
