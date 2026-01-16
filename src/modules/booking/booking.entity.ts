import { Status } from "../../../generated/prisma/enums.js";

export class Booking {
  constructor(
    public id: string | undefined,
    public userId: string,
    public eventId: string,
    public ticketCounts: number,
    public status: Status = Status.PENDING
  ) {}
  comfirmBooking() {
    this.status = Status.CONFIRMED;
  }
}
