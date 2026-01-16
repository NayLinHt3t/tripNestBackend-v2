export interface Review {
  id: string;
  userId: string;
  eventId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface CreateReviewDto {
  eventId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}
