const app = require('express')();
const http = require('http');
const bodyParser = require('body-parser');
const mongo = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Logger = require('bunyan');

const users = require('./users');
const rooms = require('./rooms');

class ChatServer {
  constructor(options) {
    this.options = options;
    this.port = options.port;
    this.mongo_port = options.mongo_port;
    this.logger = Logger.createLogger({name: 'server', level: 'debug'});
    this.server = http.createServer(app);
    this.users = users(options);
    this.rooms = rooms({...options, server: this.server});
    app.use(cors());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use(this.trace());
    app.get('/status', this.status());

    // unauthenticated routes
    app.post('/signup', this.users.signup());
    app.post('/signin', this.users.signin());

    // authenticated routes
    app.use(this.validateRequest());
    app.post('/room', this.rooms.createRoom());
    app.get('/rooms', this.rooms.getRooms());
    app.get('/room/:room_name', this.rooms.getRoom());
    app.get('/room/:room_name/messages', this.rooms.getPreviousMessages());
  }

  trace() {
    return (req, res, next) => {
      this.logger.info({path: req.path, body: req.body, params: req.params}, 'request trace');
      next();
    };
  }

  status() {
    return (req, res) => {
      this.logger.info({}, 'status request');
      return res.sendStatus(200);
    };
  }

  validateRequest() {
    return (req, res, next) => {
      try {
        req.username = jwt.verify(req.headers.token, this.options.jwt_secret).username;
        next();
      } catch (error) {
        this.logger.error({token: req.headers.token}, 'unverified request');
        return res.sendStatus(401);
      }
    };
  }

  async loadMongoDb() {
    try {
      this.db = (await mongo.MongoClient.connect(`mongodb://localhost:${this.mongo_port}`, {useUnifiedTopology: true})).db('chat-db');
      this.logger.info('mongodb loaded');
    } catch (error) {
      this.logger.error(error);
    }
  }

  async listen() {
    await this.loadMongoDb();
    await Promise.all([this.users.setDB(this.db), this.rooms.setDB(this.db)]);
    this.server.listen(this.port);
    this.logger.info('server is listening');
    return this.port;
  }

  async close() {
    this.server.close();
  }
}

module.exports = (options) => new ChatServer(options);
