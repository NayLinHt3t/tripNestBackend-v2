import {
  ChatRoom,
  ChatMember,
  ChatMessage,
  ChatRoomWithDetails,
  ChatMessageWithSender,
  ChatMemberWithDetails,
} from "./chatting.entity.js";

export interface ChatRepository {
  // Chat Room operations
  findRoomById(roomId: string): Promise<ChatRoom | null>;
  findRoomByEventId(eventId: string): Promise<ChatRoom | null>;
  findRoomDetailsById(roomId: string): Promise<ChatRoomWithDetails | null>;
  findRoomDetailsByEventId(
    eventId: string,
  ): Promise<ChatRoomWithDetails | null>;
  findRoomsByUserId(userId: string): Promise<ChatRoomWithDetails[]>;
  createRoom(eventId: string): Promise<ChatRoom>;
  getEventOrganizerUserId(eventId: string): Promise<string | null>;

  // Chat Member operations
  findMemberByRoomAndUser(
    roomId: string,
    userId: string,
  ): Promise<ChatMember | null>;
  findMembersByRoomId(roomId: string): Promise<ChatMemberWithDetails[]>;
  addMember(roomId: string, userId: string): Promise<ChatMember>;
  removeMember(roomId: string, userId: string): Promise<void>;

  // Chat Message operations
  findMessagesByRoomId(
    roomId: string,
    limit?: number,
    before?: Date,
  ): Promise<ChatMessageWithSender[]>;
  createMessage(
    roomId: string,
    senderId: string,
    content: string,
  ): Promise<ChatMessage>;

  // Booking verification
  hasConfirmedBooking(userId: string, eventId: string): Promise<boolean>;
}
