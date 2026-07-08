const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config({ quiet: true });

const SENSOR_MODEL = 'k6 notifications synthetic station';
const COLLECTION_NAME = 'measurements';
const CONFIRM_ENV_VAR = 'DELETE_MEASUREMENTS_CONFIRM';

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is required in .env or the current shell.');
  }

  const client = new MongoClient(uri);

  await client.connect();

  try {
    const database = client.db();
    const collection = database.collection(COLLECTION_NAME);
    const filter = { sensorModel: SENSOR_MODEL };
    const matchingDocuments = await collection.countDocuments(filter);
    const shouldDelete =
      process.env[CONFIRM_ENV_VAR]?.toLowerCase() === 'true';

    console.log(`Database: ${database.databaseName}`);
    console.log(`Collection: ${COLLECTION_NAME}`);
    console.log('Filter:', JSON.stringify(filter));
    console.log(`Matching measurements: ${matchingDocuments}`);

    if (!shouldDelete) {
      console.log('');
      console.log('Dry run only. No documents were deleted.');
      console.log(
        `Set ${CONFIRM_ENV_VAR}=true and run this script again to delete the matching measurements.`,
      );
      return;
    }

    const result = await collection.deleteMany(filter);

    console.log('');
    console.log('Delete result:', {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    });
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
