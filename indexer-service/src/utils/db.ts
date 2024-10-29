import { MongoClient, ServerApiVersion } from 'mongodb';
import * as Sentry from '@sentry/node';
import { config } from '../config';
import { logger } from './logger';

Sentry.init({
  dsn: config.sentryDSN,
  tracesSampleRate: 1.0,
});

export class DatabaseConnection {
  private static instance: DatabaseConnection;

  private client: MongoClient;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  // Singleton pattern to ensure only one database connection
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<MongoClient> {
    try {

      logger.debug(
        `Connecting to DB ${config.mongoDB.database} at ${config.mongoDB.host}:${config.mongoDB.port}`,
      );

      // Construct MongoDB connection URI
      const uri = `mongodb+srv://${config.mongoDB.username}:${config.mongoDB.password}@${config.mongoDB.host}:${config.mongoDB.port}/${config.mongoDB.database}?retryWrites=true&w=majority`;

      // Create a MongoClient with options
      this.client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });

      // Connect to MongoDB
      await this.client.connect();
      
      return this.client;
    } catch (error) {
      Sentry.captureException(error);
      logger.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
      }
    } catch (error) {
      Sentry.captureException(error);
      logger.error('Error disconnecting from MongoDB:', error);
    }
  }

  public async getClient() {
    return this.client;
  }
}
