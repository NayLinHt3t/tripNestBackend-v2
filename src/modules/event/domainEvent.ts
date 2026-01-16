export interface DomainEvent {
  type: string;
  occuredAt: Date;
  payload: unknown;
}
