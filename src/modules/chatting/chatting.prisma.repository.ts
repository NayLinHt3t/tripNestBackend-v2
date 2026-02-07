import { PrismaClient } from "../../../generated/prisma/client.js";
import { Status } from "../../../generated/prisma/enums.js";
import { ChatRepository } from "./chatting.repository.js";
import {
  ChatRoom,
  ChatMember,
  ChatMessage,
  ChatRoomWithDetails,
  ChatMessageWithSender,
  ChatMemberWithDetails,
} from "./chatting.entity.js";

export class PrismaChatRepository implements ChatRepository {
  constructor(private prisma: PrismaClient) {}

  async findRoomById(roomId: string): Promise<ChatRoom | null> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) return null;
    return new ChatRoom(room.id, room.eventId, room.createdAt);
  }

  async findRoomByEventId(eventId: string): Promise<ChatRoom | null> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { eventId },
    });
    if (!room) return null;
    return new ChatRoom(room.id, room.eventId, room.createdAt);
  }

  async findRoomsByUserId(userId: string): Promise<ChatRoomWithDetails[]> {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      include: {
        chatRoom: {
          include: {
            event: { select: { title: true } },
            _count: { select: { members: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => {
      const room = m.chatRoom;
      const lastMsg = room.messages[0];
      return {
        id: room.id,
        eventId: room.eventId,
        createdAt: room.createdAt,
        eventTitle: room.event.title,
        memberCount: room._count.members,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              chatRoomId: lastMsg.chatRoomId,
              senderId: lastMsg.senderId,
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              senderName: lastMsg.sender.name,
              senderEmail: lastMsg.sender.email,
            }
          : null,
      };
    });
  }

  async createRoom(eventId: string): Promise<ChatRoom> {
    const room = await this.prisma.chatRoom.create({
      data: { eventId },
    });
    return new ChatRoom(room.id, room.eventId, room.createdAt);
  }

  async findMemberByRoomAndUser(
    roomId: string,
    userId: string,
  ): Promise<ChatMember | null> {
    const member = await this.prisma.chatMember.findUnique({
      where: {
        chatRoomId_userId: { chatRoomId: roomId, userId },
      },
    });
    if (!member) return null;
    return new ChatMember(
      member.id,
      member.chatRoomId,
      member.userId,
      member.joinedAt,
    );
  }

  async findMembersByRoomId(roomId: string): Promise<ChatMemberWithDetails[]> {
    const members = await this.prisma.chatMember.findMany({
      where: { chatRoomId: roomId },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return members.map((m) => ({
      id: m.id,
      chatRoomId: m.chatRoomId,
      userId: m.userId,
      joinedAt: m.joinedAt,
      userName: m.user.name,
      userEmail: m.user.email,
    }));
  }

  async addMember(roomId: string, userId: string): Promise<ChatMember> {
    const member = await this.prisma.chatMember.create({
      data: { chatRoomId: roomId, userId },
    });
    return new ChatMember(
      member.id,
      member.chatRoomId,
      member.userId,
      member.joinedAt,
    );
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    await this.prisma.chatMember.delete({
      where: {
        chatRoomId_userId: { chatRoomId: roomId, userId },
      },
    });
  }

  async findMessagesByRoomId(
    roomId: string,
    limit: number = 50,
    before?: Date,
  ): Promise<ChatMessageWithSender[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        chatRoomId: roomId,
        ...(before && { createdAt: { lt: before } }),
      },
      include: {
        sender: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return messages
      .map((m) => ({
        id: m.id,
        chatRoomId: m.chatRoomId,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt,
        senderName: m.sender.name,
        senderEmail: m.sender.email,
      }))
      .reverse(); // Return in chronological order
  }

  async createMessage(
    roomId: string,
    senderId: string,
    content: string,
  ): Promise<ChatMessage> {
    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId,
        content,
      },
    });
    return new ChatMessage(
      message.id,
      message.chatRoomId,
      message.senderId,
      message.content,
      message.createdAt,
    );
  }

  async hasConfirmedBooking(userId: string, eventId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        userId,
        eventId,
        status: Status.CONFIRMED,
      },
    });
    return !!booking;
  }
}
