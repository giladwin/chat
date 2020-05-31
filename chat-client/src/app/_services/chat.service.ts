import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { HttpClient } from '@angular/common/http';
import { Message } from '../_models/message';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';

@Injectable({providedIn: 'root'})

export class ChatService {
  private socket: io;

  constructor(private http: HttpClient) { }

  getPrevMessages() {
    return this.http.get<Message[]>(`${environment.SERVER_URL}/room/${localStorage.getItem('currentRoomName')}/messages`);
  }

  public getMessages = () => {
    return new Observable((observer) => {
      this.socket.on('chat-message', (message) => {
        observer.next(message);
      });
    });
  }

  public getUsersInRoomUpdate = () => {
    return new Observable((observer) => {
      this.socket.on('users-in-room', (message) => {
        observer.next(message);
      });
    });
  }

  public enterRoom() {
    this.socket = io(environment.SERVER_URL, {
      query: {token: localStorage.getItem('token'), room_name: localStorage.getItem('currentRoomName')},
      transports: [ 'websocket' ],
      upgrade: false,
    });
  }

  public leaveRoom() {
    this.socket.disconnect();
  }

  public sendMessage(message) {
    this.socket.emit('user-message', message);
  }

  formatMessage(msg: Message) {
    const today = new Date(msg.ts).getDate() === new Date().getDate() &&
      new Date(msg.ts).getMonth() === new Date().getMonth() &&
      new Date(msg.ts).getFullYear() === new Date().getFullYear();
    return {
      ...msg,
      ts: `${(today  ? 'Today' : new Date(msg.ts).toLocaleDateString())}, ${new Date(msg.ts).toLocaleTimeString()}`,
    };
  }
}
