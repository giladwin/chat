import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '@environments/environment';
import { Room } from '@app/_models';

@Injectable({ providedIn: 'root' })
export class RoomService {
  constructor(private http: HttpClient) { }

  getAllRooms() {
    return this.http.get<Room[]>(`${environment.SERVER_URL}/rooms`);
  }

  createRoom(roomName: string) {
    return this.http.post<void>(`${environment.SERVER_URL}/room`, {room_name: roomName});
  }
}
