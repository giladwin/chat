const chatServer = require('./bin/server');

const SERVER_PORT = 5000;
const MONGO_PORT = 10004;
const FORBIDDEN_WORDS =['voldemort'];
const DEFAULT_ROOMS = ['lobby', 'COVID-19 room', 'shekem'];
const JWT_SECRET = 'chat-token-secret';

(async () => {
  await chatServer({
    port: SERVER_PORT,
    mongo_port: MONGO_PORT,
    forbidden_words: FORBIDDEN_WORDS,
    default_rooms: DEFAULT_ROOMS,
    jwt_secret: JWT_SECRET,
  }).listen();
})();
