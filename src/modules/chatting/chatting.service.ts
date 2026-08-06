import { ChatRepository } from "./chatting.repository.js";
import {
  ChatRoom,
  ChatMessage,
  ChatRoomWithDetails,
  ChatMessageWithSender,
  ChatMemberWithDetails,
  ChatMember,
} from "./chatting.entity.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";

export class ChatService {
  constructor(private chatRepository: ChatRepository) {}

  /**
   * Ensure the caller is a member of the room, throwing if not.
   * Returns the membership record so callers can reuse it.
   */
  private async assertMember(
    roomId: string,
    userId: string,
  ): Promise<ChatMember> {
    const member = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (!member) {
      throw new ForbiddenError("You are not a member of this chat room");
    }
    return member;
  }

  /** Find the room for an event, creating it if it does not exist yet. */
  private async findOrCreateRoom(eventId: string): Promise<ChatRoom> {
    const existing = await this.chatRepository.findRoomByEventId(eventId);
    return existing ?? this.chatRepository.createRoom(eventId);
  }

  /** Add the user to the room unless they are already a member. */
  private async ensureMember(roomId: string, userId: string): Promise<void> {
    const existing = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (!existing) {
      await this.chatRepository.addMember(roomId, userId);
    }
  }

  private async ensureOrganizerMemberForEvent(
    eventId: string,
    roomId: string,
  ): Promise<void> {
    const organizerUserId =
      await this.chatRepository.getEventOrganizerUserId(eventId);
    if (!organizerUserId) return;

    await this.ensureMember(roomId, organizerUserId);
  }

  /**
   * Ensure a chat room exists for an event and add the organizer as a member.
   */
  async ensureOrganizerRoomForEvent(eventId: string): Promise<ChatRoom> {
    const room = await this.findOrCreateRoom(eventId);
    await this.ensureOrganizerMemberForEvent(eventId, room.id!);
    return room;
  }

  /**
   * Ensure a chat room exists for an event and add the user as a member.
   * Does NOT require a confirmed booking (used on booking creation).
   */
  async ensureRoomForEvent(eventId: string, userId: string): Promise<ChatRoom> {
    const room = await this.findOrCreateRoom(eventId);
    await this.ensureOrganizerMemberForEvent(eventId, room.id!);
    await this.ensureMember(room.id!, userId);
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
      throw new ForbiddenError(
        "You must have a confirmed booking to access the chat room",
      );
    }

    const room = await this.findOrCreateRoom(eventId);
    await this.ensureOrganizerMemberForEvent(eventId, room.id!);
    await this.ensureMember(room.id!, userId);

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

    await this.assertMember(roomId, userId);

    return room;
  }

  /**
   * Get members of a chat room
   */
  async getRoomMembers(
    roomId: string,
    userId: string,
  ): Promise<ChatMemberWithDetails[]> {
    await this.assertMember(roomId, userId);
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
    await this.assertMember(roomId, userId);
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
    await this.assertMember(roomId, userId);

    // Validate message content
    const message = new ChatMessage(undefined, roomId, userId, content);
    message.validate();

    return this.chatRepository.createMessage(roomId, userId, content.trim());
  }

  /**
   * Leave a chat room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await this.assertMember(roomId, userId);
    await this.chatRepository.removeMember(roomId, userId);
  }

  /**
   * Rejoin a chat room (if user still has confirmed booking)
   */
  async rejoinRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.chatRepository.findRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Chat room not found");
    }

    // Verify user still has a confirmed booking
    const hasBooking = await this.chatRepository.hasConfirmedBooking(
      userId,
      room.eventId,
    );
    if (!hasBooking) {
      throw new ForbiddenError(
        "You must have a confirmed booking to join the chat room",
      );
    }

    // Check if already a member
    const existingMember = await this.chatRepository.findMemberByRoomAndUser(
      roomId,
      userId,
    );
    if (existingMember) {
      // Kept as 403 to preserve prior behavior (see plan's open decision).
      throw new ForbiddenError("You are already a member of this chat room");
    }

    await this.chatRepository.addMember(roomId, userId);
  }
}
