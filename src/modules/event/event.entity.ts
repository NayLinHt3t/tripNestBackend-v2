export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  capacity: number;
  price: number;
  createdAt: Date;
}

export interface CreateEventDto {
  title: string;
  description: string;
  date: Date;
  location: string;
  capacity: number;
  price: number;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  date?: Date;
  location?: string;
  capacity?: number;
  price?: number;
}
