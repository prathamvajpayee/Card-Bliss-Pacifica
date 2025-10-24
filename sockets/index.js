const socketIO = require('socket.io');

let queue = [];
let game = {};

module.exports = function (server) {
  const io = socketIO(server);

  io.on('connection', (socket) => {
    io.emit("QueueLength", queue.length);

    socket.on('addQueue', (details) => {
      const alreadyInQueue = queue.find(player => player[0] === socket.id);
      const alreadyInGame = Object.values(game).find(g => g.player1 === socket.id || g.player2 === socket.id);

      if (!alreadyInQueue && !alreadyInGame) {
        queue.push([socket.id, details]);
        io.emit("QueueLength", queue.length);

        for (let i = 0; i < queue.length; i++) {
          for (let j = i + 1; j < queue.length; j++) {
            if (queue[i][1].gridSelect === queue[j][1].gridSelect) {
              const player1 = queue.splice(i, 1)[0];
              const player2 = queue.splice(j - 1, 1)[0];

              game[`room-${player1[0]}-${player2[0]}`] = {
                player1: player1[0],
                player2: player2[0],
                paired: []
              };

              io.emit("QueueLength", queue.length);
              io.emit("GameLength", Object.keys(game).length * 2);

              io.to(player1[0]).emit("matchFound", {
                content: "response",
                gridSelect: details.gridSelect,
                songSelect: details.songSelect,
                player1,
                player2
              });

              return;
            }
          }
        }
      }
    });

    socket.on('score-update-frontend', (score) => {
      const opponent = score.player1.split(',')[0] === socket.id
        ? score.player2.split(',')[0]
        : score.player1.split(',')[0];

      io.to(opponent).emit('score-update-backend', {
        card: score.card,
        score: score.score
      });
    });

    socket.on("imagesToChoose", (data) => {
      io.to(data.player2).emit("matchFound", {
        content: data.ImagesToChoose,
        gridSelect: data.gridSelect,
        songSelect: data.songSelect,
        player1: data.player1,
        player2: data.player2
      });
    });

    socket.on('cardClick', (card) => {
      if (card.cardVerify &&
        (card.paired.includes(card.cardVerify[0]) || card.paired.includes(card.cardVerify[1])) &&
        card.action === "un-flipped") {
        return socket.emit("invalidFlip", card.card);
      }

      const target = card.player1.split(",")[0] === socket.id ? card.player2.split(",")[0] : card.player1.split(",")[0];
      io.to(target).emit('cardClick', card);
    });

    socket.on("endGame", (player) => {
      const target = player.player1.split(",")[0] === socket.id ? player.player2.split(",")[0] : player.player1.split(",")[0];
      io.to(target).emit('endGame', {
        myScore: player.myScore,
        opponentScore: player.opponentScore
      });
    });

    socket.on("nameExchange", (player) => {
      const target = player.player1.split(",")[0] === socket.id ? player.player2.split(",")[0] : player.player1.split(",")[0];
      io.to(target).emit('nameExchange', player.name);
    });

    socket.on('disconnect', () => {
      for (const roomKey in game) {
        if (roomKey.includes(socket.id)) {
          delete game[roomKey];

          const otherId = roomKey
            .replace("room-", "")
            .split("-")
            .find(id => id !== socket.id);

          io.emit("gameDisconnected");
          break;
        }
      }

      queue = queue.filter(player => player[0] !== socket.id);
      io.emit("QueueLength", queue.length);
    });
  });
};
