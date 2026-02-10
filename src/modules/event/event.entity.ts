export interface EventImages {
  id: string;
  eventId: string;
  imageUrl: string;
  createdAt: Date;
}
export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  images: EventImages[];
  location: string;
  capacity: number;
  price: number;
  mood?: string | null;
  organizerId?: string | null;
  createdAt: Date;
}

export interface CreateEventDto {
  title: string;
  description: string;
  date: Date;
  location: string;
  capacity: number;
  price: number;
  mood?: string | null;
  imageUrls?: string[];
  organizerId: string;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  date?: Date;
  location?: string;
  capacity?: number;
  price?: number;
  mood?: string | null;
}
