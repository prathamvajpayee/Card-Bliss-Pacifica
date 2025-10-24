const express = require('express');
const socket = require('socket.io')
const cookieParser = require('cookie-parser')
const http = require('http')
const path = require('path');
const jwt = require('jsonwebtoken')

const app = express();
const server = http.createServer(app)
require('dotenv').config();

const io = socket(server)
const secret = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;
const queue = []
const game = {}

app.use(express.json())
app.use(express.urlencoded({ extended:true }))
app.use(cookieParser())

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

function auth(req,res,next) {
  try {
    const { token } = req.cookies;
    if (!token) return res.redirect('/access');

    const decoded = jwt.verify(token, secret);
    if (decoded.code) {
      next();
    } else {
      res.redirect('/access');
    }
  } catch (err) {
    res.redirect('/access');
  }
}

app.get('/', (req, res) => {
  res.render('app.ejs');
});


io.on('connection',(socket)=>{
  io.emit("QueueLength",queue.length)
  
  socket.on('addQueue',(details)=>{
    let alreadyInQueue = queue.find(player => player[0] === socket.id);
    let alreadyInGame = Object.entries(game).find(gameState => gameState.player1 === socket.id || gameState.player2 === socket.id);

      if(!alreadyInQueue && !alreadyInGame){
        queue.push([socket.id, details])
        io.emit("QueueLength",queue.length)

        for (let i = 0; i < queue.length; i++) {
          for (let j = i + 1; j < queue.length; j++) {
            if (queue[i][1].gridSelect === queue[j][1].gridSelect) {
              const player1 = queue.splice(i, 1)[0];
              const player2 = queue.splice(j - 1, 1)[0]; // j - 1 because the array shifted after removing i
              
              game[`room-${player1[0]}-${player2[0]}`] = {player1: player1[0], player2: player2[0], paired: []}
              io.emit("QueueLength",queue.length)
              io.emit("GameLength",(Object.keys(game).length * 2))
              io.to(player1[0]).emit("matchFound", { content: "response", gridSelect:details.gridSelect, songSelect:details.songSelect, player1:player1,player2:player2});
              
              return;
            }
          }
        }

      }
  })

  socket.on('score-update-frontend',(score)=>{
    console.log(score.score)
    io.to(score.player1.split(',')[0] == socket.id ? score.player2.split(',')[0] : score.player1.split(',')[0]).emit('score-update-backend',{ card: score.card, score:score.score})
  })

  socket.on("imagesToChoose",(ImagesToChoose)=>{
    io.to(ImagesToChoose.player2).emit("matchFound",{content: ImagesToChoose.ImagesToChoose, gridSelect:ImagesToChoose.gridSelect, songSelect:ImagesToChoose.songSelect, player1:ImagesToChoose.player1, player2:ImagesToChoose.player2 })
  })

  socket.on('cardClick',(card)=>{
    if(card.cardVerify){
      if(card.paired.includes(card.cardVerify[0]) || card.paired.includes(card.cardVerify[1]) && card.action == "un-flipped"){
        socket.emit("invalidFlip",card.card)
      }
    }
    card.player1.split(",")[0] == socket.id ?  io.to(card.player2.split(",")[0]).emit('cardClick',card) : io.to(card.player1.split(",")[0]).emit('cardClick',card)
   
  })

  socket.on("endGame",(player)=>{
    player.player1.split(",")[0] == socket.id ?  io.to(player.player2.split(",")[0]).emit('endGame',{myScore:player.myScore, opponentScore:player.opponentScore}) : io.to(player.player1.split(",")[0]).emit('endGame',{myScore:player.myScore, opponentScore:player.opponentScore})
  })

  socket.on("nameExchange",(player)=>{
    player.player1.split(",")[0] == socket.id ?  io.to(player.player2.split(",")[0]).emit('nameExchange',player.name) : io.to(player.player1.split(",")[0]).emit('nameExchange',player.name)
  })
  socket.on('disconnect',()=>{
     for (const roomKey in game) {
    if (roomKey.includes(socket.id)) {
      delete game[roomKey];

      // Notify the other player in the room
      const otherSocketId = roomKey
        .replace("room-", "")
        .split("-")
        .find(id => id !== socket.id);

      io.emit("gameDisconnected");
      break;
    }
  }
    queue.forEach((player, index)=>{
      player[0] === socket.id ? queue.splice(index,1) : null
      io.emit("QueueLength",queue.length)
    })
  })
})

app.get('/access',(req,res)=>{
  if(!req.cookies.token){
    res.render('auth')
  }
  else{
    res.redirect('/auth')
  }
})

app.post('/access',(req,res)=>{
  const code = req.body.code

  if(code == "Alucard-Turbo777"){
    const token = jwt.sign({code},secret)
    res.cookie("token",token)
    res.redirect('/')
  }
  else{
    res.redirect('/access')
  }

})

app.get('/ping',(req,res)=>{
  res.send('pong')
})
// Start server
server.listen(PORT, () => { 
  console.log(`Server running on http://localhost:${PORT}`);
});
