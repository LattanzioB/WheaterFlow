const STATION_ID = 'c6162b1d-73a5-43a4-8e1a-5d86f25498f7';
const COLLECTION_NAME = 'measurements';
const CONFIRM_ENV_VAR = 'DELETE_MEASUREMENTS_CONFIRM';

const filter = { stationId: STATION_ID };
const collection = db.getCollection(COLLECTION_NAME);
const matchingDocuments = collection.countDocuments(filter);
const shouldDelete =
  typeof process !== 'undefined' &&
  process.env[CONFIRM_ENV_VAR]?.toLowerCase() === 'true';

print(`Database: ${db.getName()}`);
print(`Collection: ${COLLECTION_NAME}`);
print('Filter:');
printjson(filter);
print(`Matching measurements: ${matchingDocuments}`);

if (!shouldDelete) {
  print('');
  print('Dry run only. No documents were deleted.');
  print(
    `Set ${CONFIRM_ENV_VAR}=true and run this script again to delete the matching measurements.`,
  );
  quit(0);
}

const result = collection.deleteMany(filter);

print('');
print('Delete result:');
printjson({
  acknowledged: result.acknowledged,
  deletedCount: result.deletedCount,
});
