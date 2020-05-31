const Logger = require('bunyan');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const errors = require('./errors');
const emailValidator = require('email-validator');

class Users {
  constructor(options) {
    this.logger = Logger.createLogger({name: 'users', level: 'debug'});
    this.logger.info('users class is up');
    this.jwt_secret = options.jwt_secret;
    this.forbidden_words = options.forbidden_words;
  }

  setDB(db) {
    this.db = db;
    this.logger.info('users mongodb was set');
  }

  async _userExistsByUsername(username) {
    return (await this.db.collection('users').find({username}).toArray()).length;
  };

  async _userExistsByEmail(email) {
    return (await this.db.collection('users').find({email}).toArray()).length;
  };

  async _getUserByEmailAndPassword(email, password) {
    const usersFound = await this.db.collection('users').find({
      email,
      hashed_password: crypto.createHash('sha256').update(password).digest('base64'),
    }).toArray();
    if (!usersFound.length) {
      throw new errors.WrongSigninError(email);
    }
    return usersFound[0];
  };

  async _addNewUser(userData) {
    this.logger.info({user_data: userData}, 'registering user');
    const {email, username, password} = userData;
    if (this.forbidden_words.filter((word) => username.toLowerCase().includes(word.toLowerCase())).length) {
      throw new errors.ForbiddenUsernameError();
    }
    if (await this._userExistsByEmail(email)) {
      throw new errors.EmailExistsError(email);
    }
    if (await this._userExistsByUsername(username)) {
      throw new errors.UsernameExistsError(username);
    }
    return await this.db.collection('users').insertOne({
      email,
      username,
      hashed_password: crypto.createHash('sha256').update(password).digest('base64'),
    });
  };

  signup() {
    return async (req, res) => {
      try {
        await this._verifySignupRequest(req.body);
        await this._addNewUser({
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
        });
        this.logger.info({username: req.body.username}, 'user signed up successfully, returning token');
        return res.send({token: jwt.sign({username: req.body.username}, this.jwt_secret)});
      } catch (error) {
        if (error instanceof errors.BadRequest) {
          return res.status(400).send({message: error.message});
        }
        this.logger.error(error);
        return res.sendStatus(500);
      }
    };
  }

  _verifySignupRequest(body) {
    if (!body.username) {
      throw new errors.BadRequest('signup request must have an username');
    }
    if (!body.password) {
      throw new errors.BadRequest('signup request must have an password');
    }
    if (!body.email) {
      throw new errors.BadRequest('signup request must have an email');
    }
    if (!emailValidator.validate(body.email)) {
      throw new errors.BadEmailFormatError(body.email);
    }
  }

  _verifySigninRequest(body) {
    if (!body.email) {
      throw new errors.BadRequest('signin request must have an email');
    }
    if (!body.password) {
      throw new errors.BadRequest('signin request must have an password');
    }
  }

  signin() {
    return async (req, res) => {
      try {
        await this._verifySigninRequest(req.body);
        const {email, password} = req.body;
        const user = await this._getUserByEmailAndPassword(email, password);
        this.logger.info({username: user.username}, 'user signed in successfully, returning token');
        return res.send({token: jwt.sign({username: user.username}, this.jwt_secret)});
      } catch (error) {
        if (error instanceof errors.BadRequest) {
          return res.status(400).send({message: error.message});
        }
        this.logger.error(error);
        return res.sendStatus(500);
      }
    };
  }
}

module.exports = (options) => new Users(options);
