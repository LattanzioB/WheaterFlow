const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ quiet: true });

const MEASUREMENT_STEP_HOURS = 4;
const MEASUREMENT_WINDOW_DAYS = 7;
const SECONDARY_USER_ID = 'mock-user-collaborator';
const SECONDARY_USER_EMAIL = 'collaborator@example.com';
const SECONDARY_USER_PASSWORD = 'mockpass123';
const SECONDARY_USER_NAME = 'Taylor';
const SECONDARY_USER_LAST_NAME = 'Observer';
const MOCK_STATION_PREFIX = 'mock-station-';
const MOCK_MEASUREMENT_PREFIX = 'mock-measurement-';

const ALERT_TYPE = {
  NONE: 'NONE',
  EXTREME_HEAT: 'EXTREME_HEAT',
  FROST: 'FROST',
  STORM: 'STORM',
  CRITICAL_HUMIDITY: 'CRITICAL_HUMIDITY',
};

const STATIONS = [
  {
    id: `${MOCK_STATION_PREFIX}primary-north-field`,
    ownerKey: 'primary',
    name: 'North Field Station',
    location: { latitude: -34.6037, longitude: -58.3816 },
    sensorModel: 'BME280',
    status: 'ACTIVE',
    alertSettings: {
      extremeHeat: true,
      frost: true,
      storm: true,
      criticalHumidity: true,
    },
    createdAt: '2026-04-20T08:00:00.000Z',
    subscriptionMap: {
      primary: [
        ALERT_TYPE.EXTREME_HEAT,
        ALERT_TYPE.STORM,
        ALERT_TYPE.CRITICAL_HUMIDITY,
      ],
      secondary: [ALERT_TYPE.STORM, ALERT_TYPE.FROST],
    },
  },
  {
    id: `${MOCK_STATION_PREFIX}primary-river-garden`,
    ownerKey: 'primary',
    name: 'River Garden Station',
    location: { latitude: -34.6186, longitude: -58.4273 },
    sensorModel: 'SHT31',
    status: 'ACTIVE',
    alertSettings: {
      extremeHeat: true,
      frost: true,
      storm: true,
      criticalHumidity: true,
    },
    createdAt: '2026-04-20T09:00:00.000Z',
    subscriptionMap: {
      primary: [ALERT_TYPE.FROST, ALERT_TYPE.CRITICAL_HUMIDITY],
      secondary: [ALERT_TYPE.EXTREME_HEAT],
    },
  },
  {
    id: `${MOCK_STATION_PREFIX}secondary-greenhouse`,
    ownerKey: 'secondary',
    name: 'Greenhouse Backup Station',
    location: { latitude: -34.5412, longitude: -58.4731 },
    sensorModel: 'BMP390',
    status: 'INACTIVE',
    alertSettings: {
      extremeHeat: true,
      frost: true,
      storm: false,
      criticalHumidity: true,
    },
    createdAt: '2026-04-20T10:00:00.000Z',
    subscriptionMap: {
      primary: [ALERT_TYPE.EXTREME_HEAT, ALERT_TYPE.CRITICAL_HUMIDITY],
      secondary: [ALERT_TYPE.FROST, ALERT_TYPE.STORM],
    },
  },
];

function roundDownToFourHourBoundary(date) {
  const rounded = new Date(date);
  rounded.setUTCMinutes(0, 0, 0);
  rounded.setUTCHours(rounded.getUTCHours() - (rounded.getUTCHours() % 4));
  return rounded;
}

function buildTimeline(now = new Date()) {
  const end = roundDownToFourHourBoundary(now);
  const start = new Date(
    end.getTime() - MEASUREMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const stepMs = MEASUREMENT_STEP_HOURS * 60 * 60 * 1000;
  const timeline = [];

  for (let time = start.getTime(); time <= end.getTime(); time += stepMs) {
    timeline.push(new Date(time));
  }

  return timeline;
}

function getOwnerId(station, users) {
  return station.ownerKey === 'primary' ? users.primary._id : users.secondary._id;
}

function buildNotificationPreferences(userKey) {
  return STATIONS.map((station) => ({
    stationId: station.id,
    alertTypes: station.subscriptionMap[userKey],
  }));
}

function evaluateAlert(reading, station) {
  if (station.alertSettings.extremeHeat && reading.temperature > 40) {
    return ALERT_TYPE.EXTREME_HEAT;
  }

  if (station.alertSettings.frost && reading.temperature < 0) {
    return ALERT_TYPE.FROST;
  }

  if (station.alertSettings.storm && reading.pressure < 980) {
    return ALERT_TYPE.STORM;
  }

  if (station.alertSettings.criticalHumidity && reading.humidity > 90) {
    return ALERT_TYPE.CRITICAL_HUMIDITY;
  }

  return ALERT_TYPE.NONE;
}

function buildReading(stationId, index, reportedAt) {
  let temperature;
  let humidity;
  let pressure;

  if (stationId === `${MOCK_STATION_PREFIX}primary-north-field`) {
    temperature = 25 + (index % 6) * 1.7;
    humidity = 52 + ((index * 7) % 28);
    pressure = 1009 - ((index + 2) % 5) * 4;

    if (index % 10 === 3) {
      temperature = 42.6;
    }

    if (index % 14 === 8) {
      pressure = 975.2;
    }

    if (index % 12 === 5) {
      humidity = 93.4;
    }
  } else if (stationId === `${MOCK_STATION_PREFIX}primary-river-garden`) {
    temperature = 9 + ((index * 3) % 11);
    humidity = 61 + ((index * 5) % 24);
    pressure = 1013 - (index % 4) * 3;

    if (index % 9 === 4) {
      temperature = -2.8;
    }

    if (index % 11 === 7) {
      humidity = 95.1;
    }

    if (index % 16 === 10) {
      pressure = 978.6;
    }
  } else {
    temperature = 17 + ((index * 4) % 14);
    humidity = 54 + ((index * 6) % 30);
    pressure = 1007 - (index % 6) * 2;

    if (index % 15 === 2) {
      temperature = 41.4;
    }

    if (index % 13 === 6) {
      humidity = 92.2;
    }

    if (index % 10 === 1) {
      pressure = 974.4;
    }
  }

  return {
    _id: `${MOCK_MEASUREMENT_PREFIX}${stationId}-${reportedAt
      .toISOString()
      .replace(/[:.]/g, '-')}`,
    stationId,
    temperature: Number(temperature.toFixed(1)),
    humidity: Number(humidity.toFixed(1)),
    pressure: Number(pressure.toFixed(1)),
    reportedAt,
  };
}

async function resolvePrimaryUser(usersCollection) {
  const configuredEmail = process.env.MOCK_PRIMARY_USER_EMAIL?.trim().toLowerCase();

  if (configuredEmail) {
    const configuredUser = await usersCollection.findOne({ email: configuredEmail });

    if (!configuredUser) {
      throw new Error(
        `No user found for MOCK_PRIMARY_USER_EMAIL=${configuredEmail}`,
      );
    }

    return configuredUser;
  }

  const realUsers = await usersCollection
    .find({ _id: { $ne: SECONDARY_USER_ID } })
    .toArray();

  if (realUsers.length !== 1) {
    throw new Error(
      `Expected exactly one pre-existing user or set MOCK_PRIMARY_USER_EMAIL. Found ${realUsers.length}.`,
    );
  }

  return realUsers[0];
}

async function upsertSecondaryUser(usersCollection) {
  const passwordHash = await bcrypt.hash(SECONDARY_USER_PASSWORD, 10);
  const existing = await usersCollection.findOne({ _id: SECONDARY_USER_ID });
  const baseCreatedAt = existing?.createdAt ?? new Date();

  const userDocument = {
    _id: SECONDARY_USER_ID,
    name: SECONDARY_USER_NAME,
    lastName: SECONDARY_USER_LAST_NAME,
    email: SECONDARY_USER_EMAIL,
    passwordHash,
    notificationPreferences: [],
    deliveryChannels: {
      telegram: {
        chatId: null,
      },
    },
    telegramLinking: {
      code: null,
      expiresAt: null,
    },
    role: 'USER',
    createdAt: baseCreatedAt,
  };

  await usersCollection.replaceOne(
    { _id: SECONDARY_USER_ID },
    userDocument,
    { upsert: true },
  );

  return userDocument;
}

function mergePreferences(existingPreferences, mockPreferences) {
  const preserved = (existingPreferences ?? []).filter(
    (preference) => !preference.stationId.startsWith(MOCK_STATION_PREFIX),
  );

  return [...preserved, ...mockPreferences];
}

async function upsertStations(stationsCollection, users) {
  const stationDocuments = STATIONS.map((station) => ({
    _id: station.id,
    name: station.name,
    location: station.location,
    sensorModel: station.sensorModel,
    status: station.status,
    ownerId: getOwnerId(station, users),
    alertSettings: station.alertSettings,
    createdAt: new Date(station.createdAt),
  }));

  for (const stationDocument of stationDocuments) {
    await stationsCollection.replaceOne(
      { _id: stationDocument._id },
      stationDocument,
      { upsert: true },
    );
  }

  return stationDocuments;
}

async function replaceMeasurements(measurementsCollection) {
  await measurementsCollection.deleteMany({
    _id: { $regex: `^${MOCK_MEASUREMENT_PREFIX}` },
  });

  const timeline = buildTimeline();
  const measurementDocuments = [];

  for (const station of STATIONS) {
    for (const [index, reportedAt] of timeline.entries()) {
      const reading = buildReading(station.id, index, reportedAt);
      const alertType = evaluateAlert(reading, station);

      measurementDocuments.push({
        ...reading,
        alertStatus: alertType !== ALERT_TYPE.NONE,
        alertType,
      });
    }
  }

  await measurementsCollection.insertMany(measurementDocuments, { ordered: false });

  return {
    measurementDocuments,
    timelineCount: timeline.length,
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');
  const stationsCollection = db.collection('weather_stations');
  const measurementsCollection = db.collection('measurements');

  const primaryUser = await resolvePrimaryUser(usersCollection);
  const secondaryUser = await upsertSecondaryUser(usersCollection);

  await stationsCollection.deleteMany({
    _id: { $regex: `^${MOCK_STATION_PREFIX}` },
  });

  const users = {
    primary: primaryUser,
    secondary: secondaryUser,
  };

  const stationDocuments = await upsertStations(stationsCollection, users);
  const { measurementDocuments, timelineCount } =
    await replaceMeasurements(measurementsCollection);

  const refreshedPrimaryUser = await usersCollection.findOne({ _id: primaryUser._id });
  const refreshedSecondaryUser = await usersCollection.findOne({
    _id: secondaryUser._id,
  });

  await usersCollection.updateOne(
    { _id: primaryUser._id },
    {
      $set: {
        notificationPreferences: mergePreferences(
          refreshedPrimaryUser?.notificationPreferences,
          buildNotificationPreferences('primary'),
        ),
      },
    },
  );

  await usersCollection.updateOne(
    { _id: secondaryUser._id },
    {
      $set: {
        notificationPreferences: mergePreferences(
          refreshedSecondaryUser?.notificationPreferences,
          buildNotificationPreferences('secondary'),
        ),
      },
    },
  );

  console.log(
    JSON.stringify(
      {
        primaryUser: {
          id: primaryUser._id,
          email: primaryUser.email,
        },
        secondaryUser: {
          id: SECONDARY_USER_ID,
          email: SECONDARY_USER_EMAIL,
          password: SECONDARY_USER_PASSWORD,
        },
        stationsSeeded: stationDocuments.length,
        measurementsSeeded: measurementDocuments.length,
        measurementsPerStation: timelineCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });
