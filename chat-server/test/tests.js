const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {describe, it, before, after, beforeEach} = require('mocha');
require('should');

const server = require('../bin/server');

describe('chat server tests', function() {
  let request;

  let chatServer;

  before(async function() {
    chatServer = server({
      port: 5006,
      mongo_port: 10004,
      forbidden_words: ['voldemort'],
      default_rooms: ['lobby', 'COVID-19 room', 'shekem'],
      jwt_secret: 'chat-server-secret-test',
    });

    const port = await chatServer.listen();
    request = supertest('http://localhost:' + port);
    serverUrl = `http://localhost:${port}`;
  });

  after(async function() {
    await chatServer.close();
  });

  describe('server tests', function() {
    describe('/status', function() {
      it('GET should return 200', async function() {
        await request.get('/status').expect(200);
      });
    });
  });

  describe('users tests', function() {
    beforeEach(async function() {
      await chatServer.db.collection('users').deleteMany({username: 'gilad-test'});
    });

    after(async function() {
      await chatServer.db.collection('users').deleteMany({username: 'gilad-test'});
    });

    describe('/signup', function() {
      it('POST without username should return 400', async function() {
        const {body} = await request.post('/signup').send({
          password: 1234,
          email: 'giladw-test@gmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: 'signup request must have an username',
        });
      });

      it('POST without password should return 400', async function() {
        const {body} = await request.post('/signup').send({
          username: 'gilad-test',
          email: 'giladw-test@gmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: 'signup request must have an password',
        });
      });

      it('POST without email should return 400', async function() {
        const {body} = await request.post('/signup').send({
          username: 'gilad-test',
          password: 1234,
        }).expect(400);
        body.should.be.deepEqual({
          message: 'signup request must have an email',
        });
      });

      it('POST with existing email should return 400', async function() {
        await chatServer.db.collection('users').insertOne({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        });
        const {body} = await request.post('/signup').send({
          username: 'gilad2-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: `email 'giladw-test@gmail.com' is already register, please sign in`,
        });
      });

      it('POST with taken username should return 400', async function() {
        await chatServer.db.collection('users').insertOne({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        });
        const {body} = await request.post('/signup').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw2-test@gmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: `username 'gilad-test' is taken, please choose other username`,
        });
      });

      it('POST with forbidden username should return 400', async function() {
        const {body} = await request.post('/signup').send({
          username: 'voldemort',
          password: '1234',
          email: 'giladw2-test@gmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: 'username contains forbidden word(s), please choose a nicer username',
        });
      });

      it('POST with wrong email format should return 400', async function() {
        const {body} = await request.post('/signup').send({
          username: 'gilad2-test',
          password: '1234',
          email: 'giladw-testgmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: `'giladw-testgmail.com' is not a valid email address, please enter a real email`,
        });
      });

      it('POST should return insert to db, 200 with token with username on it', async function() {
        const {body} = await request.post('/signup').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(200);
        body.should.have.property('token');
        jwt.verify(body.token, chatServer.options.jwt_secret).should.have.property('username', 'gilad-test');
        const dbUser = await chatServer.db.collection('users').findOne({
          username: 'gilad-test',
        });
        dbUser.should.have.property('username', 'gilad-test');
        dbUser.should.have.property('email', 'giladw-test@gmail.com');
        dbUser.should.have.property('hashed_password', crypto.createHash('sha256').update('1234')
          .digest('base64'));
      });
    });

    describe('/signin', function() {
      it('POST without password should return 400', async function() {
        const {body} = await request.post('/signin').send({
          email: 'giladw-test@gmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: 'signin request must have an password',
        });
      });

      it('POST without email should return 400', async function() {
        const {body} = await request.post('/signin').send({
          password: '1234',
        }).expect(400);
        body.should.be.deepEqual({
          message: 'signin request must have an email',
        });
      });

      it('POST when user does not exists should return 400', async function() {
        const {body} = await request.post('/signin').send({
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: `email 'giladw-test@gmail.com' does no exist or wrong password entered`,
        });
      });


      it('POST with wrong password should return 400', async function() {
        await chatServer.db.collection('users').insertOne({
          username: 'gilad-test',
          email: 'giladw-test@gmail.com',
          hashed_password: crypto.createHash('sha256').update('1234').digest('base64'),
        });
        const {body} = await request.post('/signin').send({
          password: '12345',
          email: 'giladw-test@gmail.com',
        }).expect(400);
        body.should.be.deepEqual({
          message: `email 'giladw-test@gmail.com' does no exist or wrong password entered`,
        });
      });

      it('POST with correct password should return 400 and token with username on it', async function() {
        await chatServer.db.collection('users').insertOne({
          username: 'gilad-test',
          email: 'giladw-test@gmail.com',
          hashed_password: crypto.createHash('sha256').update('1234').digest('base64'),
        });
        const {body} = await request.post('/signin').send({
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(200);
        body.should.have.property('token');
        jwt.verify(body.token, chatServer.options.jwt_secret).should.have.property('username', 'gilad-test');
      });
    });

    describe('users flow tests', function() {
      it('POST /signup -> POST /signup with same email', async function() {
        const {body: firstSignupResponseBody} = await request.post('/signup').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(200);
        firstSignupResponseBody.should.have.property('token');
        jwt.verify(firstSignupResponseBody.token, chatServer.options.jwt_secret)
          .should.have.property('username', 'gilad-test');
        const {body: secondPostUserResponseBody} = await request.post('/signup').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(400);
        secondPostUserResponseBody.should.be.deepEqual({
          message: `email 'giladw-test@gmail.com' is already register, please sign in`,
        });
      });

      it('POST /signup -> POST /signup with same username', async function() {
        const {body: firstSignupResponseBody} = await request.post('/signup').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(200);
        firstSignupResponseBody.should.have.property('token');
        jwt.verify(firstSignupResponseBody.token, chatServer.options.jwt_secret)
          .should.have.property('username', 'gilad-test');
        const {body: secondSignupResponseBody} = await request.post('/signup').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw2-test@gmail.com',
        }).expect(400);
        secondSignupResponseBody.should.be.deepEqual({
          message: `username 'gilad-test' is taken, please choose other username`,
        });
      });

      it('POST /signup -> POST /signin', async function() {
        const {body: signupResponseBody} = await request.post('/signup').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(200);
        signupResponseBody.should.have.property('token');
        jwt.verify(signupResponseBody.token, chatServer.options.jwt_secret)
          .should.have.property('username', 'gilad-test');
        const {body: signinResponseBody} = await request.post('/signin').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(200);
        signinResponseBody.should.have.property('token');
        jwt.verify(signinResponseBody.token, chatServer.options.jwt_secret)
          .should.have.property('username', 'gilad-test');
      });

      it('POST /signup -> POST /signin wrong password', async function() {
        const {body: signupResponseBody} = await request.post('/signup').send({
          username: 'gilad-test',
          password: '1234',
          email: 'giladw-test@gmail.com',
        }).expect(200);
        signupResponseBody.should.have.property('token');
        jwt.verify(signupResponseBody.token, chatServer.options.jwt_secret)
          .should.have.property('username', 'gilad-test');
        const {body: signinResponseBody} = await request.post('/signin').send({
          username: 'gilad-test',
          password: '12345',
          email: 'giladw-test@gmail.com',
        }).expect(400);
        signinResponseBody.should.be.deepEqual({
          message: `email 'giladw-test@gmail.com' does no exist or wrong password entered`,
        });
      });
    });
  });

  describe('rooms tests', function() {
    let token;

    before(async function() {
      token = jwt.sign({username: 'gilad-test'}, chatServer.options.jwt_secret);
    });

    beforeEach(async function() {
      await chatServer.db.collection('rooms').deleteMany({name: 'test-room'});
    });

    after(async function() {
      await chatServer.db.collection('rooms').deleteMany({name: 'test-room'});
    });

    describe('/room', function() {
      it('POST without token should return 401', async function() {
        await request.post('/room').send({room_name: 'test-room'}).expect(401);
      });

      it('POST without room name should return 400', async function() {
        const {body} = await request.post('/room').set({token}).expect(400);
        body.should.be.deepEqual({
          message: 'no room name provided',
        });
      });

      it('POST with exists room name should return 400', async function() {
        await chatServer.db.collection('rooms').insertOne({
          name: 'test-room',
          messages: [],
          users: [],
        });
        const {body} = await request.post('/room').send({
          room_name: 'test-room',
        }).set({token}).expect(400);
        body.should.be.deepEqual({
          message: `room 'test-room' is already exists, please choose it from the list or use a different name`,
        });
      });

      it('POST with forbidden room name should return 400', async function() {
        const {body} = await request.post('/room').send({
          room_name: chatServer.options.forbidden_words[0],
        }).set({token}).expect(400);
        body.should.be.deepEqual({
          message: 'room name contains forbidden word(s), please choose a nicer room name',
        });
      });

      it('POST with room name should return 200', async function() {
        const {body} = await request.post('/room').send({
          room_name: 'test-room',
        }).set({token}).expect(200);
        body.should.be.deepEqual({
          message: `room 'test-room' was created`,
        });
        const dbRoom = await chatServer.db.collection('rooms').findOne({
          name: 'test-room',
        });
        dbRoom.should.have.property('name', 'test-room');
      });
    });

    describe('/rooms', function() {
      it('GET without token should return 401', async function() {
        await request.post('/room').send({room_name: 'test-room'}).expect(401);
      });

      it('GET should return 200 with rooms', async function() {
        await chatServer.db.collection('rooms').insertOne({
          name: 'test-room',
          messages: [],
          users: [],
        });
        const {body} = await request.get('/rooms').set({token}).expect(200);
        body.should.be.an.Array();
        body.should.containEql({
          name: 'test-room',
          users: 0,
        });
      });

      it('GET should return 200 with rooms - users in room', async function() {
        await chatServer.db.collection('rooms').insertOne({
          name: 'test-room',
          messages: [],
          users: ['gilad-test'],
        });
        const {body} = await request.get('/rooms').set({token}).expect(200);
        body.should.be.an.Array();
        body.should.containEql({
          name: 'test-room',
          users: 1,
        });
      });
    });

    describe('/room/:room_name', function() {
      it('GET without token should return 401', async function() {
        await request.post('/room').send({room_name: 'test-room'}).expect(401);
      });

      it('GET when room does not exist should return 404', async function() {
        const {body} = await request.get('/room/voldemort').set({token}).expect(404);
        body.should.be.deepEqual({
          message: `no such room 'voldemort', please create one or join existing room`,
        });
      });

      it('GET should return 200', async function() {
        await chatServer.db.collection('rooms').insertOne({
          name: 'test-room',
          messages: [],
          users: [],
        });
        const {body} = await request.get('/room/test-room').set({token}).expect(200);
        body.should.be.deepEqual({
          name: 'test-room',
          users: [],
        });
      });

      it('GET should return 200 - with users in room', async function() {
        await chatServer.db.collection('rooms').insertOne({
          name: 'test-room',
          messages: [],
          users: ['gilad-test'],
        });
        const {body} = await request.get('/room/test-room').set({token}).expect(200);
        body.should.be.deepEqual({
          name: 'test-room',
          users: ['gilad-test'],
        });
      });
    });

    describe('/room/:room_name/messages', function() {
      it('GET without token should return 401', async function() {
        await request.post('/room').send({room_name: 'test-room'}).expect(401);
      });

      it('GET when room does not exist should return 404', async function() {
        const {body} = await request.get('/room/voldemort/messages').set({token}).expect(404);
        body.should.be.deepEqual({
          message: `no such room 'voldemort', please create one or join existing room`,
        });
      });

      it('GET should return 200 - no messages', async function() {
        await chatServer.db.collection('rooms').insertOne({
          name: 'test-room',
          messages: [],
          users: [],
        });
        const {body} = await request.get('/room/test-room/messages').set({token}).expect(200);
        body.should.be.deepEqual([]);
      });

      it('GET should return 200 - with messages', async function() {
        await chatServer.db.collection('rooms').insertOne({
          name: 'test-room',
          messages: [{text: 'hello', ts: new Date('2020-05-23T14:20:58.360Z'), username: 'gilad-test'}],
          users: ['gilad-test'],
        });
        const {body} = await request.get('/room/test-room/messages').set({token}).expect(200);
        body.should.be.deepEqual([{
          text: 'hello',
          ts: '2020-05-23T14:20:58.360Z',
          username: 'gilad-test',
        }]);
      });
    });

    describe('rooms flow tests', function() {
      it('POST /room -> GET /rooms -> GET /room/:room_name -> GET /room/:room_name/messages', async function() {
        const {body: postRoomResponseBody} = await request.post('/room').send({
          room_name: 'test-room',
        }).set({token}).expect(200);
        postRoomResponseBody.should.be.deepEqual({
          message: `room 'test-room' was created`,
        });
        const {body: getRoomBody} = await request.get('/room/test-room').set({token}).expect(200);
        getRoomBody.should.be.deepEqual({
          name: 'test-room',
          users: [],
        });
        const {body: getRoomMessagesBody} = await request.get('/rooms').set({token}).expect(200);
        getRoomMessagesBody.should.be.an.Array();
        getRoomMessagesBody.should.containEql({
          name: 'test-room',
          users: 0,
        });
        const {body: getRoomsResponseBody} = await request.get('/room/test-room/messages').set({token}).expect(200);
        getRoomsResponseBody.should.be.deepEqual([]);
      });

      it('POST /room -> POST /room with same name', async function() {
        const {body: firstPostRoomResponseBody} = await request.post('/room').send({
          room_name: 'test-room',
        }).set({token}).expect(200);
        firstPostRoomResponseBody.should.be.deepEqual({
          message: `room 'test-room' was created`,
        });
        const {body: secondGostRoomResponseBody} = await request.post('/room').send({
          room_name: 'test-room',
        }).set({token}).expect(400);
        secondGostRoomResponseBody.should.be.deepEqual({
          message: `room 'test-room' is already exists, please choose it from the list or use a different name`,
        });
      });
    });
  });
});
