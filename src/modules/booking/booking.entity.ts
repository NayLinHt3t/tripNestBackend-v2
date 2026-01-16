import { Status } from "../../../generated/prisma/enums";

export class Booking {
  constructor(
    public id: number,
    public userId: string,
    public eventId: string,
    public ticketCounts: number,
    public status: Status = Status.PENDING
  ) {}
  comfirmBooking() {
    this.status = Status.CONFIRMED;
  }
}
