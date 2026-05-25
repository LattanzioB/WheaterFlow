import 'dotenv/config';
import mongoose from 'mongoose';

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/weatherflow';
const COLLECTION_NAME = 'user_notification_profiles';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  await mongoose.connect(uri);

  const result = await mongoose.connection
    .collection(COLLECTION_NAME)
    .updateMany(
      { 'deliveryChannels.inApp': { $exists: false } },
      { $set: { 'deliveryChannels.inApp': true } },
    );

  console.log(
    `Backfilled deliveryChannels.inApp=true on ${result.modifiedCount} notification profiles.`,
  );

  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
