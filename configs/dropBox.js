const mongoose = require('mongoose');
const fetch = require('isomorphic-fetch');
const { dbxRefreshToken, dbxClientId, dbxSecret} = require('./dotenv');

console.log( dbxClientId)

// Define a schema for storing tokens
const tokenSchema = new mongoose.Schema({
    access_token: { type: String, required: true },
    expires_at: { type: Date, required: true } // Expiration time of the access token
}, { collection: 'dbxAccessToken' });  // Specify the collection name as 'dbxAccessToken'

const Token = mongoose.model('Token', tokenSchema);

// Load tokens from MongoDB
const loadTokens = async () => {
    const tokenData = await Token.findOne({});
    if (!tokenData) {
        throw new Error('Tokens not found');
    }
    return tokenData;
};

// Save tokens to MongoDB
const saveTokens = async (accessToken, expiresAt) => {
    const tokenData = await Token.findOneAndUpdate({}, {
        access_token: accessToken,
        expires_at: expiresAt
    }, { upsert: true, new: true });
    return tokenData;
};

// Refresh the access token
const refreshAccessToken = async () => {
    const refreshToken = dbxRefreshToken;
    console.log(refreshToken)

    if (!refreshToken) {
        throw new Error('Refresh token not found in environment variables');
    }

    // Using isomorphic-fetch to refresh the token
    const url = 'https://api.dropbox.com/oauth2/token';

    // Prepare the body for the request
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: dbxClientId,
        client_secret: dbxSecret
    });

    // Make the POST request
    const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded', // Required for URL-encoded POST data
        }
    });

    // Handle the response
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error refreshing token: ${errorText}`);
    }

    const data = await response.json();
    const { access_token, expires_in } = data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    await saveTokens(access_token, expiresAt);


    console.log('new access token: ' + access_token)
    return access_token;
};

module.exports = { loadTokens, saveTokens, refreshAccessToken };
