# chat - server and client

## environments variables

- server variables - can be changed in [server.js](chat-server/server.js)  

  | variable        | default value                        |
  | :-------------- | :-----------------------------------:|
  | SERVER_PORT     | 5000                                 |
  | MONGO_PORT      | 10004                                |
  | FORBIDDEN_WORDS | ['voldemort']                        |
  | DEFAULT_ROOMS   | ['lobby', 'COVID-19 room', 'shekem'] |
  | JWT_SECRET      | 'chat-token-secret'                  |

- client variables - can be changed in [environment.ts](chat-client/src/environments/environment.ts)

  | variable   | default value           |
  | :--------- | :----------------------:|
  | SERVER_URL | 'http://localhost:5000' |


## MongoDB database
run server:
```
mongod --port 10004
```

## node.js server

install:
```
npm --prefix chat-server i
```

run:
```
npm --prefix chat-server start
```

tests (mongo server should be up):
```
npm --prefix chat-server test
```

## angular client

install:

```
npm --prefix chat-client  i
```

run:

```
npm run start --prefix chat-client 
```