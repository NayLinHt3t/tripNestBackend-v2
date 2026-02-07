import { Router, Request, Response } from "express";
import { ChatService } from "./chatting.service.js";

interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

export function createChatRouter(chatService: ChatService): Router {
  const router = Router();

  /**
   * GET /api/chat/rooms
   * Get all chat rooms the user is a member of
   */
  router.get("/rooms", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const rooms = await chatService.getUserChatRooms(userId);
      res.json({ rooms });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  /**
   * POST /api/chat/events/:eventId/join
   * Join or create a chat room for an event
   */
  router.post(
    "/events/:eventId/join",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message.includes("confirmed booking")) {
          return res.status(403).json({ error: message });
        }
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * GET /api/chat/rooms/:roomId
   * Get chat room details
   */
  router.get(
    "/rooms/:roomId",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not a member")) {
          return res.status(403).json({ error: message });
        }
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * GET /api/chat/rooms/:roomId/members
   * Get chat room members
   */
  router.get(
    "/rooms/:roomId/members",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not a member")) {
          return res.status(403).json({ error: message });
        }
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * GET /api/chat/rooms/:roomId/messages
   * Get chat room messages with pagination
   */
  router.get(
    "/rooms/:roomId/messages",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not a member")) {
          return res.status(403).json({ error: message });
        }
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * POST /api/chat/rooms/:roomId/messages
   * Send a message to a chat room
   */
  router.post(
    "/rooms/:roomId/messages",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const { roomId } = req.params as { roomId: string };
        const { content } = req.body;

        if (!content || typeof content !== "string") {
          return res.status(400).json({ error: "Message content is required" });
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
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        if (msg.includes("not a member")) {
          return res.status(403).json({ error: msg });
        }
        if (msg.includes("cannot be empty") || msg.includes("exceed")) {
          return res.status(400).json({ error: msg });
        }
        res.status(500).json({ error: msg });
      }
    },
  );

  /**
   * POST /api/chat/rooms/:roomId/leave
   * Leave a chat room
   */
  router.post(
    "/rooms/:roomId/leave",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const { roomId } = req.params as { roomId: string };
        await chatService.leaveRoom(roomId, userId);

        res.json({ message: "Successfully left the chat room" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not a member")) {
          return res.status(403).json({ error: message });
        }
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * POST /api/chat/rooms/:roomId/rejoin
   * Rejoin a chat room (must have confirmed booking)
   */
  router.post(
    "/rooms/:roomId/rejoin",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const { roomId } = req.params as { roomId: string };
        await chatService.rejoinRoom(roomId, userId);

        res.json({ message: "Successfully rejoined the chat room" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (
          message.includes("confirmed booking") ||
          message.includes("already a member")
        ) {
          return res.status(403).json({ error: message });
        }
        if (message.includes("not found")) {
          return res.status(404).json({ error: message });
        }
        res.status(500).json({ error: message });
      }
    },
  );

  return router;
}
