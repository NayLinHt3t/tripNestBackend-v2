import http from "http";
import { Server } from "socket.io";
import app, { allowedOrigins } from "./index.js";

const port = process.env.PORT || 3000;
const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
