import { ChatRepository } from "./chatting.repository.js";
import {
  ChatRoom,
  ChatMessage,
  ChatRoomWithDetails,
  ChatMessageWithSender,
  ChatMemberWithDetails,
} from "./chatting.entity.js";

export class ChatService {
  constructor(private chatRepository: ChatRepository) {}

  private async ensureOrganizerMemberForEvent(
    eventId: string,
    roomId: string,
  ): Promise<void> {
    const organizerUserId =
      await this.chatRepository.getEventOrganizerUserId(eventId);
    if (!organizerUserId) return;

    const existingOrganizer = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      organizerUserId,
    );
    if (!existingOrganizer) {
      await this.chatRepository.addMember(roomId, organizerUserId);
    }
  }

  /**
   * Ensure a chat room exists for an event and add the organizer as a member.
   */
  async ensureOrganizerRoomForEvent(eventId: string): Promise<ChatRoom> {
    let room = await this.chatRepository.findRoomByEventId(eventId);
    if (!room) {
      room = await this.chatRepository.createRoom(eventId);
    }

    await this.ensureOrganizerMemberForEvent(eventId, room.id!);

    return room;
  }

  /**
   * Ensure a chat room exists for an event and add the user as a member.
   * Does NOT require a confirmed booking (used on booking creation).
   */
  async ensureRoomForEvent(eventId: string, userId: string): Promise<ChatRoom> {
    let room = await this.chatRepository.findRoomByEventId(eventId);
    if (!room) {
      room = await this.chatRepository.createRoom(eventId);
    }

    await this.ensureOrganizerMemberForEvent(eventId, room.id!);

    const existingMember = await this.chatRepository.findMemberByRoomAndUser(
      room.id!,
      userId,
    );
    if (!existingMember) {
      await this.chatRepository.addMember(room.id!, userId);
    }

    return room;
  }

  /**
   * Get or create a chat room for an event.
   * Only users with confirmed bookings can access.
   */
  async getOrCreateRoomForEvent(
    eventId: string,
    userId: string,
  ): Promise<ChatRoomWithDetails> {
    // Verify user has a confirmed booking for this event
    const hasBooking = await this.chatRepository.hasConfirmedBooking(
      userId,
      eventId,
    );
    if (!hasBooking) {
      throw new Error(
        "You must have a confirmed booking to access the chat room",
      );
    }

    // Find or create the chat room
    let room = await this.chatRepository.findRoomByEventId(eventId);
    if (!room) {
      room = await this.chatRepository.createRoom(eventId);
    }

    await this.ensureOrganizerMemberForEvent(eventId, room.id!);

    // Add user as a member if not already
    const existingMember = await this.chatRepository.findMemberByRoomAndUser(
      room.id!,
      userId,
    );
    if (!existingMember) {
      await this.chatRepository.addMember(room.id!, userId);
    }

    const roomDetails =
      await this.chatRepository.findRoomDetailsByEventId(eventId);

    return roomDetails ?? room;
  }

  /**
   * Get all chat rooms the user is a member of
   */
  async getUserChatRooms(userId: string): Promise<ChatRoomWithDetails[]> {
    return this.chatRepository.findRoomsByUserId(userId);
  }

  /**
   * Get chat room details by ID
   */
  async getChatRoom(
    roomId: string,
    userId: string,
  ): Promise<ChatRoomWithDetails | null> {
    const room = await this.chatRepository.findRoomDetailsById(roomId);
    if (!room) return null;

    // Verify user is a member
    const member = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (!member) {
      throw new Error("You are not a member of this chat room");
    }

    return room;
  }

  /**
   * Get members of a chat room
   */
  async getRoomMembers(
    roomId: string,
    userId: string,
  ): Promise<ChatMemberWithDetails[]> {
    // Verify user is a member
    const member = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (!member) {
      throw new Error("You are not a member of this chat room");
    }

    return this.chatRepository.findMembersByRoomId(roomId);
  }

  /**
   * Get messages from a chat room with pagination
   */
  async getMessages(
    roomId: string,
    userId: string,
    limit: number = 50,
    before?: Date,
  ): Promise<ChatMessageWithSender[]> {
    // Verify user is a member
    const member = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (!member) {
      throw new Error("You are not a member of this chat room");
    }

    return this.chatRepository.findMessagesByRoomId(roomId, limit, before);
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
  ): Promise<ChatMessage> {
    // Verify user is a member
    const member = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (!member) {
      throw new Error("You are not a member of this chat room");
    }

    // Validate message content
    const message = new ChatMessage(undefined, roomId, userId, content);
    message.validate();

    return this.chatRepository.createMessage(roomId, userId, content.trim());
  }

  /**
   * Leave a chat room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const member = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (!member) {
      throw new Error("You are not a member of this chat room");
    }

    await this.chatRepository.removeMember(roomId, userId);
  }

  /**
   * Rejoin a chat room (if user still has confirmed booking)
   */
  async rejoinRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.chatRepository.findRoomById(roomId);
    if (!room) {
      throw new Error("Chat room not found");
    }

    // Verify user still has a confirmed booking
    const hasBooking = await this.chatRepository.hasConfirmedBooking(
      userId,
      room.eventId,
    );
    if (!hasBooking) {
      throw new Error(
        "You must have a confirmed booking to join the chat room",
      );
    }

    // Check if already a member
    const existingMember = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (existingMember) {
      throw new Error("You are already a member of this chat room");
    }

    await this.chatRepository.addMember(roomId, userId);
  }
}
