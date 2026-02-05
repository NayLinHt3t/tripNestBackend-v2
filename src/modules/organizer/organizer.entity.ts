export class OrganizerProfile {
  constructor(
    public id: string | undefined,
    public userId: string,
    public organizationName?: string,
    public contactNumber?: string,
    public address?: string,
  ) {}
}
