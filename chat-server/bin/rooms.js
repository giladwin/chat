const jwt = require('jsonwebtoken');
const Socket = require('socket.io');
const Logger = require('bunyan');

const errors = require('./errors');

class Rooms {
  constructor(options) {
    this.logger = Logger.createLogger({name: 'rooms', level: 'debug'});
    this.logger.info('rooms class is up');
    this.default_rooms = options.default_rooms;
    this.forbidden_words = options.forbidden_words;
    this.jwt_secret = options.jwt_secret;
    this.io = new Socket(options.server);
    this.io.on('connection', this._onSocketConnection());
    this.logger.info('io-socket was created');
  }

  async setDB(db) {
    this.db = db;
    this.logger.info({default_rooms: this.default_rooms}, 'rooms mongodb was set, creating default rooms');
    await Promise.all(this.default_rooms.map(((roomName) => this._createRoom(roomName, true))));
    this.logger.info({default_rooms: this.default_rooms}, 'default rooms were created');
  }

  async _updateUsersSockets(roomName) {
    this.io.to(roomName).emit('users-in-room', {name: roomName, users: (await this._getRoom(roomName)).users});
  }

  async _addUserToRoom(roomName, username) {
    await this.db.collection('rooms').updateOne({name: roomName}, {$push: {users: username}});
    await this._updateUsersSockets(roomName);
  }

  async _removeUserFromRoom(roomName, username) {
    await this.db.collection('rooms').updateOne({name: roomName}, {$pull: {users: username}});
    await this._updateUsersSockets(roomName);
  }

  async _createRoom(roomName, defaultRoom = false) {
    if ((await this.db.collection('rooms').find({name: roomName}).toArray()).length) {
      this.logger.info({room_name: roomName}, 'room already exists');
      if (defaultRoom) {
        return;
      }
      throw new errors.RoomExistsError(roomName);
    }
    if (this.forbidden_words.filter((word) => roomName.toLowerCase().includes(word.toLowerCase())).length) {
      this.logger.info({room_name: roomName}, 'forbidden room name');
      if (defaultRoom) {
        return;
      }
      throw new errors.ForbiddenRoomNameError();
    }
    this.logger.info({room_name: roomName}, 'creating room');
    await this.db.collection('rooms').insertOne({name: roomName});
    this.logger.info({room_name: roomName}, 'room was created');
  }

  _validateCreateRoomRequest(body) {
    if (!body.room_name) {
      throw new errors.BadRequest('no room name provided');
    }
  }

  createRoom() {
    return async (req, res) => {
      try {
        this._validateCreateRoomRequest(req.body);
        this.logger.info({username: req.username, roomName: req.body.room_name}, 'user is creating a new room');
        await this._createRoom(req.body.room_name);
        return res.status(200).send({message: `room '${req.body.room_name}' was created`});
      } catch (error) {
        if (error instanceof errors.BadRequest) {
          return res.status(error.code).send({message: error.message});
        }
        return res.sendStatus(500);
      }
    };
  }

  async _getRooms() {
    return (await this.db.collection('rooms').find().toArray())
      .map((room) => {
        return {
          name: room.name,
          users: [...new Set((room.users || []))].length,
        };
      }).sort((r1, r2) => r2.users - r1.users);
  }

  getRooms() {
    return async (req, res) => {
      try {
        return res.status(200).send(await this._getRooms());
      } catch (error) {
        return res.sendStatus(500);
      }
    };
  }

  async _getRoom(roomName) {
    const room = await this.db.collection('rooms').findOne({name: roomName});
    if (!room) {
      throw new errors.NoSuchRoomError(roomName);
    }
    return {name: room.name, users: [...new Set(room.users || [])]};
  }

  getRoom() {
    return async (req, res) => {
      try {
        return res.status(200).send(await this._getRoom(req.params.room_name));
      } catch (error) {
        if (error instanceof errors.BadRequest) {
          return res.status(error.code).send({message: error.message});
        }
        return res.sendStatus(500);
      }
    };
  }

  async _saveMessage(roomName, message) {
    await this.db.collection('rooms').updateOne({name: roomName}, {$push: {messages: message}});
  }

  async _getRoomMessages(roomName) {
    const room = await this.db.collection('rooms').findOne({name: roomName});
    if (!room) {
      throw new errors.NoSuchRoomError(roomName);
    }
    return (room.messages || []).sort((m1, m2) => new Date(m1.ts).getTime() - new Date(m2.ts).getTime());
  }

  getPreviousMessages() {
    return async (req, res) => {
      try {
        return res.status(200).send(await this._getRoomMessages(req.params.room_name));
      } catch (error) {
        if (error instanceof errors.BadRequest) {
          return res.status(error.code).send({message: error.message});
        }
        return res.sendStatus(500);
      }
    };
  }

  _validateRequest(token) {
    try {
      return jwt.verify(token, this.jwt_secret);
    } catch (error) {
      throw new errors.UnauthenticatedTokenError;
    }
  }

  _createMessage(text, username) {
    return {
      ts: new Date(),
      text,
      ...(username && {username}),
    };
  }

  _onSocketConnection() {
    return async (socket) => {
      try {
        const username = this._validateRequest(socket.handshake.query.token).username;
        const roomName = socket.handshake.query.room_name;
        if (!roomName) {
          this.logger.error({username, message: msg}, 'client has no room name, can not register');
          return;
        }
        this.logger.info({room_name: roomName, username}, 'new connection');
        await this._getRoom(roomName); // verify room exists
        await socket.join(roomName);
        this.logger.info({username, room: roomName}, 'user joined room');
        setTimeout(() => {
          socket.emit('chat-message', this._createMessage(`welcome to room ${roomName}, ${username}`));
        }, 1000);
        socket.to(roomName).emit('chat-message', this._createMessage(`${username} has joined the room`));
        this._addUserToRoom(roomName, username);
        socket.on('disconnect', async (reason) => {
          socket.to(roomName).emit('chat-message', this._createMessage(`${username} has left the room`));
          await socket.leave(roomName);
          await this._removeUserFromRoom(roomName, username);
          this.logger.info({username, room: roomName}, 'socket left room');
          this.logger.info({username, reason}, 'user disconnected');
        });
        socket.on('user-message', async (message) => {
          this.logger.info({room: roomName, username, message}, 'user has sent a message');
          if (this.forbidden_words.filter((word) => message.toLowerCase().includes(word.toLowerCase())).length) {
            socket.emit('chat-message', this._createMessage(`${username}, your message contains bad words, please think about a nicer message`));
            return;
          }
          const formatedMsg = this._createMessage(message, username);
          this.io.to(roomName).emit('chat-message', formatedMsg);
          await this._saveMessage(roomName, formatedMsg);
        });
      } catch (error) {
        if (error instanceof errors.NoSuchRoomError) {
          this.logger.error({room: socket.handshake.query.room_name}, 'room does not exist');
          return;
        }
        this.logger.warn({token: socket.handshake.query.token}, 'unauthorized connection');
        socket.disconnect(true);
      }
    };
  }
}

module.exports = (options) => new Rooms(options);
