export class UserProfile {
  constructor(
    public id: string | undefined,
    public userId: string,
    public fullName?: string,
    public phone?: string,
    public dateOfBirth?: Date,
    public gender?: string,
    public profilePictureUrl?: string,
  ) {}
}
