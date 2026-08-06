import { Router, Request, Response } from "express";
import { ChatService } from "./chatting.service.js";
import { asyncHandler, getUserId } from "../../shared/http.js";
import { ValidationError } from "../../shared/errors.js";

export function createChatRouter(chatService: ChatService): Router {
  const router = Router();

  /**
   * GET /api/chat/rooms
   * Get all chat rooms the user is a member of
   */
  router.get(
    "/rooms",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const rooms = await chatService.getUserChatRooms(userId);
      res.json({ rooms });
    }),
  );

  /**
   * POST /api/chat/events/:eventId/join
   * Join or create a chat room for an event
   */
  router.post(
    "/events/:eventId/join",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { eventId } = req.params as { eventId: string };
      const room = await chatService.getOrCreateRoomForEvent(eventId, userId);
      res.json({
        message: "Successfully joined chat room",
        room: {
          id: room.id,
          eventId: room.eventId,
          createdAt: room.createdAt,
          eventTitle: room.eventTitle,
          eventImageUrl: room.eventImageUrl,
        },
      });
    }),
  );

  /**
   * GET /api/chat/rooms/:roomId
   * Get chat room details
   */
  router.get(
    "/rooms/:roomId",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { roomId } = req.params as { roomId: string };
      const room = await chatService.getChatRoom(roomId, userId);

      if (!room) {
        return res.status(404).json({ error: "Chat room not found" });
      }

      res.json({
        room: {
          id: room.id,
          eventId: room.eventId,
          createdAt: room.createdAt,
          eventTitle: room.eventTitle,
          eventImageUrl: room.eventImageUrl,
        },
      });
    }),
  );

  /**
   * GET /api/chat/rooms/:roomId/members
   * Get chat room members
   */
  router.get(
    "/rooms/:roomId/members",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { roomId } = req.params as { roomId: string };
      const members = await chatService.getRoomMembers(roomId, userId);

      res.json({
        members: members.map((m) => ({
          id: m.id,
          userId: m.userId,
          userName: m.userName,
          userEmail: m.userEmail,
          joinedAt: m.joinedAt,
        })),
      });
    }),
  );

  /**
   * GET /api/chat/rooms/:roomId/messages
   * Get chat room messages with pagination
   */
  router.get(
    "/rooms/:roomId/messages",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { roomId } = req.params as { roomId: string };
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const before = req.query.before
        ? new Date(req.query.before as string)
        : undefined;

      const messages = await chatService.getMessages(
        roomId,
        userId,
        limit,
        before,
      );

      res.json({
        messages: messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          senderEmail: m.senderEmail,
          content: m.content,
          createdAt: m.createdAt,
        })),
      });
    }),
  );

  /**
   * POST /api/chat/rooms/:roomId/messages
   * Send a message to a chat room
   */
  router.post(
    "/rooms/:roomId/messages",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { roomId } = req.params as { roomId: string };
      const { content } = req.body;

      if (!content || typeof content !== "string") {
        throw new ValidationError("Message content is required");
      }

      const message = await chatService.sendMessage(roomId, userId, content);

      res.status(201).json({
        message: {
          id: message.id,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt,
        },
      });
    }),
  );

  /**
   * POST /api/chat/rooms/:roomId/leave
   * Leave a chat room
   */
  router.post(
    "/rooms/:roomId/leave",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { roomId } = req.params as { roomId: string };
      await chatService.leaveRoom(roomId, userId);

      res.json({ message: "Successfully left the chat room" });
    }),
  );

  /**
   * POST /api/chat/rooms/:roomId/rejoin
   * Rejoin a chat room (must have confirmed booking)
   */
  router.post(
    "/rooms/:roomId/rejoin",
    asyncHandler(async (req: Request, res: Response) => {
      const userId = getUserId(req);
      const { roomId } = req.params as { roomId: string };
      await chatService.rejoinRoom(roomId, userId);

      res.json({ message: "Successfully rejoined the chat room" });
    }),
  );

  return router;
}
