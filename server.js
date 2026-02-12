const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ── TMDB ──
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const GENRE_MAP = {28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western'};

const MOCK_MOVIES = [
  {id:1,title:'The Adam Project',year:2022,rating:6.7,genres:['Action','Sci-Fi','Comedy'],desc:'A time-traveling pilot teams up with his younger self and his late father to come to terms with his past while saving the future.',poster:'https://image.tmdb.org/t/p/w500/wFjboE0aFZNbVOF05fzrka9Fqyx.jpg'},
  {id:2,title:'Glass Onion',year:2022,rating:7.1,genres:['Comedy','Crime','Mystery'],desc:'Tech billionaire Miles Bron invites his friends for a getaway on his private Greek island.',poster:'https://image.tmdb.org/t/p/w500/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg'},
  {id:3,title:'All Quiet on the Western Front',year:2022,rating:7.8,genres:['Drama','War'],desc:'A young German soldier endures the dehumanizing horrors of trench warfare.',poster:'https://image.tmdb.org/t/p/w500/2IRjbi9cADuDMKmqmGGhlad15KV.jpg'},
  {id:4,title:"Guillermo del Toro's Pinocchio",year:2022,rating:7.6,genres:['Animation','Fantasy','Drama'],desc:"A father's wish magically brings a wooden boy to life in Italy.",poster:'https://image.tmdb.org/t/p/w500/vx1u0uwxdlhV2MUzj4VqcMIYO2l.jpg'},
  {id:5,title:'The Sea Beast',year:2022,rating:7.1,genres:['Animation','Adventure','Family'],desc:'In an era when terrifying beasts roamed the seas, monster hunters were celebrated heroes.',poster:'https://image.tmdb.org/t/p/w500/aZKKnCuz8HHzJ4BsJiB2OBlYmMi.jpg'},
  {id:6,title:'Enola Holmes 2',year:2022,rating:7.2,genres:['Adventure','Comedy','Crime'],desc:'Now a detective-for-hire, Enola Holmes takes on her first official case.',poster:'https://image.tmdb.org/t/p/w500/tegBpjM4PnXMBBwexmMKGOqMBOh.jpg'},
  {id:7,title:"Don't Look Up",year:2021,rating:7.2,genres:['Comedy','Drama','Sci-Fi'],desc:'Two astronomers must warn mankind of an approaching comet that will destroy Earth.',poster:'https://image.tmdb.org/t/p/w500/th4E1yqsE8DGpAseLiUrI60Hf9V.jpg'},
  {id:8,title:'The Power of the Dog',year:2021,rating:6.9,genres:['Drama','Western'],desc:'Charismatic rancher Phil Burbank inspires fear and awe in those around him.',poster:'https://image.tmdb.org/t/p/w500/kEy48iCzGnp0ao1cZbNeWR6yIhC.jpg'},
  {id:9,title:'Red Notice',year:2021,rating:6.8,genres:['Action','Comedy','Thriller'],desc:"An FBI profiler pursuing the world's most wanted art thief becomes his reluctant partner.",poster:'https://image.tmdb.org/t/p/w500/lAXONicR4G1DhluMqjeT7bpSNH3.jpg'},
  {id:10,title:'The Mitchells vs. the Machines',year:2021,rating:7.7,genres:['Animation','Comedy','Sci-Fi'],desc:"A quirky family's road trip is upended by the robot apocalypse.",poster:'https://image.tmdb.org/t/p/w500/mI2Di7HmskQQ34kz0ib8EpmenX3.jpg'},
  {id:11,title:'Tick, Tick... Boom!',year:2021,rating:7.5,genres:['Drama','Music'],desc:'A promising young theater composer navigates love, friendship, and pressure.',poster:'https://image.tmdb.org/t/p/w500/tnGxhen5VN0RFGGOqj22GiRYsfn.jpg'},
  {id:12,title:'Nimona',year:2023,rating:7.6,genres:['Animation','Action','Fantasy'],desc:"A knight framed for a crime finds an unlikely ally in a shape-shifting teen.",poster:'https://image.tmdb.org/t/p/w500/3FcvHTnQOQVFfnS4CHpqdwByBuB.jpg'},
  {id:13,title:'Extraction 2',year:2023,rating:7.1,genres:['Action','Thriller'],desc:'Tyler Rake is back as a fearless black market mercenary.',poster:'https://image.tmdb.org/t/p/w500/7gKI9hpEMcZUQpNgKrkDzJpbnNS.jpg'},
  {id:14,title:'The Killer',year:2023,rating:6.7,genres:['Crime','Thriller'],desc:'An assassin battles his employers and himself on an international manhunt.',poster:'https://image.tmdb.org/t/p/w500/e7Jvsiy1ljEEqpMPL4kDOf3SRgq.jpg'},
  {id:15,title:'Leave the World Behind',year:2023,rating:6.5,genres:['Drama','Thriller','Mystery'],desc:"A family's vacation is upended by two strangers bearing news of a blackout.",poster:'https://image.tmdb.org/t/p/w500/29rhl1xopxA7JlGVVsf1UHfYPvN.jpg'},
];

async function fetchTMDBMovies() {
  if (!TMDB_API_KEY) return MOCK_MOVIES;
  const allMovies = [];
  try {
    for (let page = 1; page <= 5; page++) {
      const url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=8&watch_region=US&sort_by=popularity.desc&page=${page}&vote_count.gte=100`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data.results) break;
      for (const m of data.results) {
        allMovies.push({
          id: m.id,
          title: m.title,
          year: (m.release_date || '').slice(0, 4),
          rating: Math.round(m.vote_average * 10) / 10,
          genres: (m.genre_ids || []).map(g => GENRE_MAP[g] || '').filter(Boolean),
          desc: m.overview,
          poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
        });
      }
    }
    return allMovies.length > 0 ? allMovies : MOCK_MOVIES;
  } catch (e) {
    console.warn('TMDB fetch failed, using mock:', e.message);
    return MOCK_MOVIES;
  }
}

// ── Rooms ──
// Each room has two player slots (0 and 1).
// Swipes tracked by slot — survives reconnects and shared-browser visitorId.
const rooms = new Map();

function generateCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (rooms.has(code));
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPlayerSlot(room, socketId) {
  if (room.players[0]?.socketId === socketId) return 0;
  if (room.players[1]?.socketId === socketId) return 1;
  return -1;
}

function getConnectedCount(room) {
  return room.players.filter(p => p !== null).length;
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('create-room', async (vid, cb) => {
    const code = generateCode();
    const movies = shuffle(await fetchTMDBMovies());
    rooms.set(code, {
      players: [
        { socketId: socket.id, visitorId: vid },  // slot 0 = creator
        null,                                       // slot 1 = empty
      ],
      swipes: [
        {},  // slot 0 swipes: { movieId: 'right'|'left' }
        {},  // slot 1 swipes
      ],
      matches: [],
      matchData: {},
      movies,
    });
    currentRoom = code;
    socket.join(code);
    console.log(`[create] room=${code} slot=0 socket=${socket.id} movies=${movies.length}`);
    cb({ code, userCount: 1, movies, playerSlot: 0 });
  });

  socket.on('join-room', ({ code, visitorId: vid }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb({ error: 'Room not found' });

    // Check if this socket is already in a slot (reconnect)
    let slot = getPlayerSlot(room, socket.id);

    if (slot === -1) {
      // Assign to empty slot
      if (room.players[1] === null) {
        slot = 1;
      } else if (room.players[0] === null) {
        slot = 0;
      } else {
        return cb({ error: 'Room is full' });
      }
      room.players[slot] = { socketId: socket.id, visitorId: vid };
    }

    currentRoom = code;
    socket.join(code);
    const userCount = getConnectedCount(room);
    console.log(`[join] room=${code} slot=${slot} socket=${socket.id} userCount=${userCount}`);
    cb({ code, userCount, matches: room.matches, matchData: room.matchData, movies: room.movies, playerSlot: slot });
    io.to(code).emit('user-joined', { userCount, movies: room.movies });
  });

  socket.on('get-movies', (cb) => {
    if (!currentRoom) return cb({ error: 'Not in a room' });
    const room = rooms.get(currentRoom);
    if (!room) return cb({ error: 'Room not found' });
    cb({ movies: room.movies });
  });

  socket.on('swipe', ({ movieId, direction, movieData }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const slot = getPlayerSlot(room, socket.id);
    if (slot === -1) return;

    // Record swipe for this player's slot
    room.swipes[slot][movieId] = direction;

    // Check for match against the OTHER slot
    if (direction === 'right') {
      const otherSlot = slot === 0 ? 1 : 0;
      if (room.swipes[otherSlot][movieId] === 'right' && !room.matches.includes(movieId)) {
        room.matches.push(movieId);
        room.matchData[movieId] = movieData;
        io.to(currentRoom).emit('match', { movieId, movieData });
        console.log(`[match!] room=${currentRoom} movie="${movieData.title}" (${movieId})`);
      }
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const slot = getPlayerSlot(room, socket.id);
    if (slot !== -1) {
      console.log(`[disconnect] room=${currentRoom} slot=${slot} socket=${socket.id}`);
      // Keep swipe data! Just clear the socket reference so slot can be reclaimed
      room.players[slot] = null;
      socket.to(currentRoom).emit('user-left', { userCount: getConnectedCount(room) });

      // Clean up empty rooms after 5 min
      if (getConnectedCount(room) === 0) {
        setTimeout(() => {
          const r = rooms.get(currentRoom);
          if (r && getConnectedCount(r) === 0) rooms.delete(currentRoom);
        }, 300000);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Movie Match running on http://localhost:${PORT}`));
