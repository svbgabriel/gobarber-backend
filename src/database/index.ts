import mongoose from 'mongoose';
import { db } from './db';

class Database {
  public connection = db;
  public mongoConnection: any;

  constructor() {
    this.mongo();
  }

  mongo() {
    this.mongoConnection = mongoose.connect(process.env.MONGO_URL!);
  }
}

export default new Database();
