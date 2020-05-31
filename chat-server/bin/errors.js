class BadRequest extends Error {
  constructor(text) {
    super(text);
    this.code = 400;
  }
}

class WrongSigninError extends BadRequest {
  constructor(email) {
    super(`email '${email}' does no exist or wrong password entered`);
  }
}

class EmailExistsError extends BadRequest {
  constructor(email) {
    super(`email '${email}' is already register, please sign in`);
  }
}

class BadEmailFormatError extends BadRequest {
  constructor(email) {
    super(`'${email}' is not a valid email address, please enter a real email`);
  }
}

class ForbiddenUsernameError extends BadRequest {
  constructor() {
    super('username contains forbidden word(s), please choose a nicer username');
  }
}

class UsernameExistsError extends BadRequest {
  constructor(username) {
    super(`username '${username}' is taken, please choose other username`);
  }
}

class UnauthenticatedTokenError extends BadRequest {
  constructor() {
    super(`got authenticated token`);
    this.code = 401;
  }
}

class NoSuchRoomError extends BadRequest {
  constructor(roomName) {
    super(`no such room '${roomName}', please create one or join existing room`);
    this.code = 404;
  }
}

class RoomExistsError extends BadRequest {
  constructor(roomName) {
    super(`room '${roomName}' is already exists, please choose it from the list or use a different name`);
  }
}

class ForbiddenRoomNameError extends BadRequest {
  constructor() {
    super('room name contains forbidden word(s), please choose a nicer room name');
  }
}

module.exports = {
  BadRequest,
  WrongSigninError,
  EmailExistsError,
  BadEmailFormatError,
  ForbiddenUsernameError,
  UsernameExistsError,
  UnauthenticatedTokenError,
  NoSuchRoomError,
  RoomExistsError,
  ForbiddenRoomNameError,
};
