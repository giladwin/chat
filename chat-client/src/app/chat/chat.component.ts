import {AfterViewChecked, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { first } from 'rxjs/operators';
import {Message} from '../_models/message';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ChatService} from '@app/_services/chat.service';
import {Room} from '@app/_models';

@Component({ templateUrl: 'chat.component.html' })
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  // @ts-ignore
  @ViewChild('messages') private messagesScroll: any;
  loading = true;
  sendMessageForm: FormGroup;
  currentRoomName: string;
  messageList: Message[];
  usersInRoom: string[];

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService
  ) { }

  ngOnInit() {
    this.currentRoomName = localStorage.getItem('currentRoomName');
    this.chatService.enterRoom();
    this.messagesScroll.nativeElement.scrollTop = this.messagesScroll.nativeElement.scrollHeight;
    this.chatService.getPrevMessages().pipe(first()).subscribe(messages => {
      this.loading = false;
      this.messageList = messages.map(msg => this.chatService.formatMessage(msg));
    });
    this.sendMessageForm = this.formBuilder.group({
      message: ['', Validators.required],
    });
    this.chatService.getMessages().subscribe((message: Message) => {
      if (this.messageList) {
        this.messageList.push(this.chatService.formatMessage(message));
      }
    });
    this.chatService.getUsersInRoomUpdate().subscribe((roomInfo: Room) => {
      this.usersInRoom = roomInfo.users;
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.messagesScroll.nativeElement.scrollTop = this.messagesScroll.nativeElement.scrollHeight;
    } catch (err) { }
  }

  ngOnDestroy() {
    this.chatService.leaveRoom();
  }

  get sendMessageControls() {
    return this.sendMessageForm.controls;
  }

  sendMessage() {
    this.loading = true;
    if (this.sendMessageForm.invalid) {
      this.loading = false;
      return;
    }
    this.chatService.sendMessage(this.sendMessageControls.message.value);
    this.loading = false;
  }
}
