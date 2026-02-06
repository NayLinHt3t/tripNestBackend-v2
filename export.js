import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function exportAll() {
  console.log("🔄 Starting database export...\n");

  // Export Users
  const users = await prisma.user.findMany();
  fs.writeFileSync("exports/users.json", JSON.stringify(users, null, 2));
  console.log(`✅ Users: ${users.length} records`);

  // Export UserProfiles
  const userProfiles = await prisma.userProfile.findMany();
  fs.writeFileSync(
    "exports/userProfiles.json",
    JSON.stringify(userProfiles, null, 2),
  );
  console.log(`✅ UserProfiles: ${userProfiles.length} records`);

  // Export OrganizerProfiles
  const organizerProfiles = await prisma.organizerProfile.findMany();
  fs.writeFileSync(
    "exports/organizerProfiles.json",
    JSON.stringify(organizerProfiles, null, 2),
  );
  console.log(`✅ OrganizerProfiles: ${organizerProfiles.length} records`);

  // Export Events
  const events = await prisma.event.findMany();
  fs.writeFileSync("exports/events.json", JSON.stringify(events, null, 2));
  console.log(`✅ Events: ${events.length} records`);

  // Export EventImages
  const eventImages = await prisma.eventImages.findMany();
  fs.writeFileSync(
    "exports/eventImages.json",
    JSON.stringify(eventImages, null, 2),
  );
  console.log(`✅ EventImages: ${eventImages.length} records`);

  // Export Bookings
  const bookings = await prisma.booking.findMany();
  fs.writeFileSync("exports/bookings.json", JSON.stringify(bookings, null, 2));
  console.log(`✅ Bookings: ${bookings.length} records`);

  // Export Reviews
  const reviews = await prisma.review.findMany();
  fs.writeFileSync("exports/reviews.json", JSON.stringify(reviews, null, 2));
  console.log(`✅ Reviews: ${reviews.length} records`);

  // Export SentimentJobs
  const sentimentJobs = await prisma.sentimentJob.findMany();
  fs.writeFileSync(
    "exports/sentimentJobs.json",
    JSON.stringify(sentimentJobs, null, 2),
  );
  console.log(`✅ SentimentJobs: ${sentimentJobs.length} records`);

  console.log("\n🎉 Export completed! Files saved to ./exports/");
}

// Create exports directory if it doesn't exist
if (!fs.existsSync("exports")) {
  fs.mkdirSync("exports");
}

exportAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
