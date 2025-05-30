const mongoose = require('mongoose');
const dotenv = require('./configs/dotenv');

// Load environment variables
const atlasUri = dotenv.MONGO_ATLAS_URI;
console.log(atlasUri);

async function upsertEntireDatabase() {
  const localUri = 'mongodb://localhost:27017/users'; // Replace with your local DB URI
  
  try {
    // Connect to local MongoDB using createConnection
    const localConnection = mongoose.createConnection(localUri);
    console.log('Connected to local MongoDB');

    // Wait for the connection to be open before proceeding
    await new Promise((resolve, reject) => {
      localConnection.once('open', resolve);
      localConnection.on('error', reject);
    });

    // Get a list of all collections in the local database
    const localDb = localConnection.db;
    const collections = await localDb.listCollections().toArray();
    
    // Connect to MongoDB Atlas using createConnection
    const atlasConnection = mongoose.createConnection(atlasUri);
    console.log('Connected to MongoDB Atlas');

    // Wait for the connection to be open before proceeding
    await new Promise((resolve, reject) => {
      atlasConnection.once('open', resolve);
      atlasConnection.on('error', reject);
    });

    // Iterate over each collection in the local DB
    for (const collection of collections) {
      const collectionName = collection.name;
      
      // Get the documents from the local collection
      const documents = await localDb.collection(collectionName).find().toArray();
      
      if (documents.length > 0) {
        // Create bulk operations for upserting documents
        const bulkOps = documents.map(doc => ({
          updateOne: {
            filter: { _id: doc._id }, // Use _id for upsert
            update: { $set: doc }, // Upsert operation
            upsert: true // Insert if document doesn't exist
          }
        }));

        // Upsert the documents into the same collection in MongoDB Atlas
        const atlasDb = atlasConnection.db;
        await atlasDb.collection(collectionName).bulkWrite(bulkOps);
        console.log(`Upserted ${documents.length} documents into collection: ${collectionName}`);
      }
    }

    console.log('Upsert operation completed!');
  } catch (error) {
    console.error('Error during upsert operation:', error);
  } finally {
    // Disconnect from both local and Atlas MongoDB after all operations are done
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

upsertEntireDatabase();
