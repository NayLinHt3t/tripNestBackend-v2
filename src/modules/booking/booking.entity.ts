import { Status } from "../../../generated/prisma/enums.js";

export class Booking {
  constructor(
    public id: string | undefined,
    public userId: string,
    public eventId: string,
    public ticketCounts: number,
    public status: Status = Status.PENDING,
    public unitPrice?: number,
    public totalPrice?: number,
  ) {}
  comfirmBooking() {
    this.status = Status.CONFIRMED;
  }

  calculateTotalPrice(eventPrice: number) {
    this.unitPrice = eventPrice;
    this.totalPrice = eventPrice * this.ticketCounts;
  }

  updateTicketCounts(newTicketCounts: number) {
    this.ticketCounts = newTicketCounts;
    if (this.unitPrice) {
      this.totalPrice = this.unitPrice * newTicketCounts;
    }
  }
}
