export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(email: string, password: string, name: string): Promise<User>;
}
