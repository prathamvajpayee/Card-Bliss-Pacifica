const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
require('dotenv').config();

const appRoutes = require('./routes/app');

const app = express();
const server = http.createServer(app);

// Socket setup
const initSockets = require('./sockets');
initSockets(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', appRoutes);

app.get('/ping', (req, res) => res.send('pong'));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
