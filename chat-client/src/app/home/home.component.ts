import {Component, OnInit} from '@angular/core';
import { first } from 'rxjs/operators';
import { Room } from '@app/_models';
import {RoomService} from '@app/_services';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';

@Component({ templateUrl: 'home.component.html' })
export class HomeComponent implements OnInit {
  loading = false;
  rooms: Room[];
  createRoomForm: FormGroup;
  createRoomLoading = false;
  createRoomSubmitted = false;
  createRoomError = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService
  ) { }

  ngOnInit() {
    this.createRoomForm = this.formBuilder.group({
      roomName: ['', Validators.required],
    });
    this.loading = true;
    this.roomService.getAllRooms().pipe(first()).subscribe(rooms => {
      this.loading = false;
      this.rooms = rooms;
    });
  }

  get createRoomControls() { return this.createRoomForm.controls; }

  selectRoom(roomName) {
    localStorage.setItem('currentRoomName', roomName);
    this.router.navigate(['/chat']);
  }

  createRoom() {
    this.createRoomSubmitted = true;
    if (this.createRoomForm.invalid) {
      return;
    }
    this.roomService.createRoom(this.createRoomControls.roomName.value).subscribe(
      data => {
        localStorage.setItem('currentRoomName', this.createRoomControls.roomName.value);
        this.router.navigate(['/chat']);
      },
      error => {
        this.createRoomError = error;
        this.createRoomLoading = false;
      });
  }
}
