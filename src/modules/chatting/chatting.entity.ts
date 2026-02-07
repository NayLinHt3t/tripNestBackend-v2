export class ChatRoom {
  constructor(
    public id: string | undefined,
    public eventId: string,
    public createdAt: Date = new Date(),
  ) {}
}

export class ChatMember {
  constructor(
    public id: string | undefined,
    public chatRoomId: string,
    public userId: string,
    public joinedAt: Date = new Date(),
  ) {}
}

export class ChatMessage {
  constructor(
    public id: string | undefined,
    public chatRoomId: string,
    public senderId: string,
    public content: string,
    public createdAt: Date = new Date(),
  ) {}

  validate(): void {
    if (!this.content || this.content.trim().length === 0) {
      throw new Error("Message content cannot be empty");
    }
    if (this.content.length > 2000) {
      throw new Error("Message content cannot exceed 2000 characters");
    }
  }
}

export interface ChatRoomWithDetails extends ChatRoom {
  eventTitle?: string;
  memberCount?: number;
  lastMessage?: ChatMessageWithSender | null;
}

export interface ChatMessageWithSender extends ChatMessage {
  senderName?: string;
  senderEmail?: string;
}

export interface ChatMemberWithDetails extends ChatMember {
  userName?: string;
  userEmail?: string;
}
