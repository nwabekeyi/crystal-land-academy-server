const fetch = require('isomorphic-fetch');

// Dropbox access token
const ACCESS_TOKEN = "add acesstoken here"

// Function to create a folder
async function createFolder(path) {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: path,   // Full path of the folder to create (e.g., "/myfolder/subfolder")
        autorename: false  // Set to false to not automatically rename if folder exists
      })
    });

    const data = await response.json();
    if (data.metadata) {
      console.log(`Folder created: ${data.metadata.path_display}`);
      return true;  // Folder created successfully
    }
    return false;  // No metadata received, folder creation failed
  } catch (error) {
    console.log('Error:', error.message);
    return false;
  }
}

// Function to check if the folder exists (if it was created)
async function checkFolderExists(path) {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: path  // Full path of the folder to check (e.g., "/myfolder/subfolder")
      })
    });

    const data = await response.json();
    if (data) {
      console.log('Folder exists:', data.path_display);
      return true;  // Folder exists
    }
    return false;  // Folder doesn't exist
  } catch (error) {
    if (error.message.includes('404')) {
      console.log('Folder not found');
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Example usage
const folderPath = '/theTechArchival/idCards';  // Replace with your desired path

// Create folder
createFolder(folderPath).then(() => {
  // After creating the folder, check if it exists
  checkFolderExists(folderPath);
});
