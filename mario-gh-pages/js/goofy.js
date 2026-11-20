(function() {
  if (typeof Mario === 'undefined') window.Mario = {};

  // ---------------------------------------------------------------------------
  // Ocurrencias aleatorias de los enemigos: globos de texto y dibujos con giro.
  // No toca colisiones ni puntos de vida; solo movimiento temporal y dibujo.
  // ---------------------------------------------------------------------------
  var Goofy = Mario.Goofy = {
    pick: function(list) {
      return list[Math.floor(Math.random() * list.length)];
    },

    drawSprite: function(ctx, sprite, ent, vX, vY, rotation) {
      if (!rotation) {
        sprite.render(ctx, ent.pos[0], ent.pos[1], vX, vY);
        return;
      }
      ctx.save();
      ctx.translate(
        Math.round(ent.pos[0] - vX + 8),
        Math.round(ent.pos[1] - vY + 8)
      );
      ctx.rotate(rotation);
      sprite.render(ctx, -8, -8, 0, 0);
      ctx.restore();
    },

    drawBubble: function(ctx, ent, vX, vY) {
      if (!ent.bubble) return;
      var x = Math.round(ent.pos[0] - vX + 8);
      var y = Math.round(ent.pos[1] - vY - 5 - (ent.bubbleLift || 0));
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(23, 38, 33, 0.95)';
      ctx.strokeText(ent.bubble, x, y);
      ctx.fillStyle = '#fff3c4';
      ctx.fillText(ent.bubble, x, y);
      ctx.restore();
    }
  };
})();
