const { MongoClient, ServerApiVersion, MongoCursorInUseError } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3000;
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VMS API',
            version: '1.0.0'
        },
        components: {  // Add 'components' section
            securitySchemes: {  // Define 'securitySchemes'
                bearerAuth: {  // Define 'bearerAuth'
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
const saltRounds = 10;
const uri = "mongodb+srv://amirulidham:sayahebat@cluster0.j5tgroe.mongodb.net/";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("You successfully connected to MongoDB!");

  app.use(express.json());
  app.listen(port, () => {
    console.log(`Server listening at http://localSecurity:${port}`);
  });

  app.get('/', (req, res) => {
    res.send('Welcome to Visitor Management System');
  });

  

  /**
 * @swagger
 * /registerAdmin:
 *   post:
 *     summary: Register a new admin
 *     description: Register a new admin with required details
 *     tags:
 *       - Admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin]
 *             required:
 *               - username
 *               - password
 *               - name
 *               - email
 *               - phoneNumber
 *               - role
 *     responses:
 *       '200':
 *         description: Admin registration successful
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
  app.post('/registerAdmin', async (req, res) => {
    let data = req.body;
    res.send(await registerAdmin(client, data));
  });

  /**
 * @swagger
 * /loginAdmin:
 *   post:
 *     summary: Log in as an admin
 *     description: Log in as an admin with valid credentials
 *     tags:
 *       - Admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *     responses:
 *       '200':
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Authentication token for the logged-in admin
 *       '401':
 *         description: Unauthorized - Invalid credentials
 */
  app.post('/loginAdmin', async (req, res) => {
    let data = req.body;
    res.send(await login(client, data));
  });


/**
 * @swagger
 * /viewAllHosts:
 *   get:
 *     summary: View all hosts and visitor records
 *     description: View all hosts and records in their respective collections (Only accessible by admin)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: All hosts and records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hosts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                       name:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                       role:
 *                         type: string
 *                 records:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       icNumber:
 *                         type: string
 *                       passIdentifier:
 *                         type: string
 *                       name:
 *                         type: string
 *                       purpose:
 *                         type: string
 *                       checkInTime:
 *                         type: string
 *                       issuedBy:
 *                         type: string
 *       '401':
 *         description: Unauthorized - Token is missing, invalid, or user is not an admin
 */

app.get('/viewAllHosts', verifyToken, isAdmin, async (req, res) => {
  const allHosts = await getAllHosts(client);
  const allRecords = await getAllRecords(client);
  
  const result = {
    hosts: allHosts,
    records: allRecords
  };

  res.status(200).json(result);
});

// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
  const userData = req.user;
  if (userData.role !== 'Admin') {
    return res.status(401).json({ error: 'Unauthorized - Only admins can view all resources' });
  }
  next();
}

// Function to retrieve all hosts from the collection
async function getAllHosts(client) {
  const hostsCollection = client.db('assignment').collection('Hosts');
  const allHosts = await hostsCollection.find().toArray();
  return allHosts;
}

// Function to retrieve all records from the collection
async function getAllRecords(client) {
  const recordsCollection = client.db('assignment').collection('Records');
  const allRecords = await recordsCollection.find().toArray();
  return allRecords;
}


/**
 * @swagger
 * /deleteUser:
 *   delete:
 *     summary: Delete a user by IC number and role (visitor or security) or phone number (host)
 *     description: Delete a user (visitor, security personnel, or host) by providing IC number and role or phone number (requires admin token)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: icNumber
 *         required: true
 *         description: IC number of the user to be deleted (required if role is 'visitor' or 'security')
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         required: true
 *         description: Role of the user to be deleted (visitor, security, or host)
 *         schema:
 *           type: string
 *           enum:
 *             - visitor
 *             - security
 *             - host
 *     responses:
 *       '200':
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deletedUser:
 *                   type: object
 *                   description: The deleted user's data
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 *       '404':
 *         description: User not found
 *       '500':
 *         description: Internal Server Error
 */
app.delete('/deleteUser', verifyToken, async (req, res) => {
  const { icNumber, role } = req.query;

  try {
    // Validate that both role and icNumber are provided
    if (!icNumber || !role) {
      res.status(400).send('IC number and role are required');
      return;
    }

    const deletedUser = await deleteUser(client, icNumber, role);

    if (deletedUser) {
      res.status(200).json({ deletedUser });
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Function to delete a user by IC number and role
async function deleteUser(client, icNumber, role) {
  let query = {};

  if (role === 'visitor' || role === 'security') {
    query.icNumber = icNumber;
  }

  const collection = client.db('assignment').collection(getCollectionName(role));
  const deletedUser = await collection.findOne(query);

  await collection.deleteOne(query);

  return deletedUser;
}

// Function to get the collection name based on the role
function getCollectionName(role) {
  return role === 'visitor' ? 'Records' : role === 'security' ? 'Security' : 'Hosts';
}





// Swagger documentation for the new endpoint
/**
 * @swagger
 * /registerSecurity:
 *   post:
 *     summary: Register a new security personnel
 *     description: Register a new security personnel with required details
 *     tags:
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               icNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum:
 *                   - security
 *             required:
 *               - username
 *               - password
 *               - name
 *               - email
 *               - phoneNumber
 *               - icNumber
 *               - role
 *     responses:
 *       '200':
 *         description: Security personnel registration successful
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
app.post('/registerSecurity', verifyToken, async (req, res) => {
  let mydata = req.body;
  res.send(await registerSecurity(client, mydata));
});

// Function to handle registration with password hashing
async function registerSecurity(client, mydata) {
  const hashedPassword = await bcrypt.hash(mydata.password, 10);

  const result = await client
    .db('assignment')
    .collection('Security')
    .insertOne({
      username: mydata.username,
      password: hashedPassword, // Store the hashed password
      name: mydata.name,
      email: mydata.email,
      phoneNumber: mydata.phoneNumber,
      icNumber: mydata.icNumber,
      role: mydata.role,
    });

  return 'Security personnel registration successful';
}



/**
 * @swagger
 * /getHostContact:
 *   get:
 *     summary: Get the contact number of the host from the given visitor pass
 *     description: Get the contact number of the host who owns the provided visitor pass (requires security token)
 *     tags:
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: passIdentifier
 *         required: true
 *         description: Visitor pass identifier
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Host contact retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hostName:
 *                   type: string
 *                 contactNumber:
 *                   type: string
 *                 visitorName:
 *                   type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 *       '404':
 *         description: Visitor pass not found or host information not available
 */
app.get('/getHostContact', verifyToken, async (req, res) => {
  const { passIdentifier } = req.query;

  try {
    // Get security personnel information based on the token
    const securityInfo = await getSecurityInfo(client, req.user.username);

    // Check if security personnel information is available
    if (!securityInfo) {
      res.status(401).send('Unauthorized - Invalid security personnel');
      return;
    }

    // Get host contact information by passIdentifier
    const hostContact = await getHostContact(client, passIdentifier);

    // Check if host contact information is available
    if (hostContact) {
      res.status(200).json({
        hostName: hostContact.hostName,
        contactNumber: hostContact.contactNumber,
        visitorName: hostContact.visitorName,
      });
    } else {
      res.status(404).send('Visitor pass not found or host information not available');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Function to get host contact by visitor pass ID
async function getHostContact(client, passIdentifier) {
  try {
    // Find the visitor pass based on passIdentifier
    const visitorPass = await client
      .db('assignment')
      .collection('Records')
      .findOne({ passIdentifier });

    // Check if the visitor pass and issuedBy field are available
    if (visitorPass && visitorPass.issuedBy) {
      // Find the host information based on the issuedBy field
      const hostInfo = await client
        .db('assignment')
        .collection('Hosts')
        .findOne({ username: visitorPass.issuedBy });

      // Check if hostInfo is available and has phoneNumber
      if (hostInfo && hostInfo.phoneNumber) {
        // Return host information
        return {
          hostName: hostInfo.username,
          contactNumber: hostInfo.phoneNumber,
          visitorName: visitorPass.name,
        };
      } else {
        console.error('Host information not found or missing phoneNumber field.');
      }
    } else {
      console.error('Visitor pass not found or missing issuedBy field.');
    }
  } catch (error) {
    console.error('Error fetching host information:', error);
    // Throw an error to be handled in the calling function
    throw new Error('Error fetching host information');
  }

  // Return null if any condition fails
  return null;
}








/**
 * @swagger
 * /getHostContactNumber:
 *   post:
 *     summary: Get host contact number for authenticated security personnel
 *     description: Retrieve the contact number of the host from the visitor pass (only reviews destination host to visit to the public)
 *     tags:
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passIdentifier:
 *                 type: string
 *             required:
 *               - passIdentifier
 *     responses:
 *       '200':
 *         description: Host contact number retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hostContactNumber:
 *                   type: string
 *                   description: Contact number of the host
 *       '401':
 *         description: Unauthorized - Invalid credentials or insufficient access level
 *       '404':
 *         description: Visitor pass not found or does not have access to host contact information
 */

app.post('/getHostContactNumber', authenticateSecurity, async (req, res) => {
  let data = req.body;
  try {
    const hostContactNumber = await getHostContactNumber(client, data.passIdentifier);
    res.status(200).json({ hostContactNumber: hostContactNumber });
  } catch (error) {
    res.status(error.status).json({ error: error.message });
  }
});

async function getHostContactNumber(client, passIdentifier) {
  // Implement logic to retrieve host contact number based on the visitor pass
  // For example, query the database to get host information associated with the passIdentifier

  const collectionVisitorPass = client.db('assignment').collection('Records');
  const passInfo = await collectionVisitorPass.findOne({ passIdentifier: passIdentifier });

  if (passInfo && passInfo.accessLevel === 'public') {
    // Access is granted to retrieve host contact number
    // Implement logic to retrieve host contact number from the host information
    const hostContactNumber = passInfo.hostContactNumber;

    if (hostContactNumber) {
      return hostContactNumber;
    } else {
      throw { status: 404, message: 'Host contact number not available for the given passIdentifier' };
    }
  } else {
    throw { status: 401, message: 'Unauthorized - Invalid passIdentifier or insufficient access level' };
  }
}



/**
 * @swagger
 * /retrieveVisitorPass:
 *   get:
 *     summary: Retrieve visitor pass information
 *     description: Retrieve detailed information for a visitor pass using the IC number
 *     tags:
 *       - Visitor
 *     parameters:
 *       - in: query
 *         name: icNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: IC number of the visitor
 *     responses:
 *       '200':
 *         description: Visitor pass information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 icNumber:
 *                   type: string
 *                 passIdentifier:
 *                   type: string
 *                 name:
 *                   type: string
 *                 purpose:
 *                   type: string
 *                 checkInTime:
 *                   type: string
 *                 issuedBy:
 *                   type: string
 *       '404':
 *         description: Visitor pass not found
 */
app.get('/retrieveVisitorPass', async (req, res) => {
  const icNumber = req.query.icNumber;

  // Retrieve visitor pass information using the provided IC number
  const passInfo = await retrieveVisitorPassByICNumber(client, icNumber);

  if (passInfo) {
    res.json({
      icNumber: passInfo.icNumber,
      passIdentifier: passInfo.passIdentifier,
      name: passInfo.name,
      purpose: passInfo.purpose,
      checkInTime: passInfo.checkInTime.toISOString(), // Adjust the format as needed
      issuedBy: passInfo.issuedBy // Add the issuedBy information
    });
  } else {
    res.status(404).send('Visitor pass not found');
  }
});

// Function to retrieve visitor pass information by IC number
async function retrieveVisitorPassByICNumber(client, icNumber) {
  const recordsCollection = client.db('assignment').collection('Records');

  // Retrieve the visitor pass information based on the IC number
  const passInfo = await recordsCollection.findOne({ icNumber });

  return passInfo;
}


/**
 * @swagger
 * /issueVisitorPass:
 *   post:
 *     summary: Issue a visitor pass
 *     description: Issue a visitor pass for a visitor without creating a visitor account
 *     tags:
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               icNumber:
 *                 type: string
 *               company:
 *                 type: string
 *               vehicleNumber:
 *                 type: string
 *               purpose:
 *                 type: string
 *             required:
 *               - name
 *               - icNumber
 *               - company
 *               - vehicleNumber
 *               - purpose
 *     responses:
 *       '200':
 *         description: Visitor pass issued successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
app.post('/issueVisitorPass', verifyToken, async (req, res) => {
  let securityData = req.user;
  let visitorData = req.body;

  // Create a visitor record without creating a visitor account
  const result = await issueVisitorPass(client, securityData, visitorData);

  res.send(result);
});

// Function to issue a visitor pass
async function issueVisitorPass(client, securityData, visitorData) {
  const recordsCollection = client.db('assignment').collection('Records');

  // Check if the visitor already has a pass issued
  const existingRecord = await recordsCollection.findOne({ icNumber: visitorData.icNumber, checkOutTime: null });

  if (existingRecord) {
    return 'Visitor already has an active pass. Cannot issue another pass until checked out.';
  }

  // Generate a unique passIdentifier for the visitor pass
  const passIdentifier = generateUniquePassIdentifier();

  const currentCheckInTime = new Date();

  const recordData = {
    icNumber: visitorData.icNumber,
    passIdentifier: passIdentifier,
    name: visitorData.name,
    company: visitorData.company,
    vehicleNumber: visitorData.vehicleNumber,
    purpose: visitorData.purpose,
    checkInTime: currentCheckInTime,
    issuedBy: securityData.username // Add the issuedBy information
  };

  // Insert the visitor record into the database
  await recordsCollection.insertOne(recordData);

  return `Visitor pass issued successfully by ${securityData.username}. Pass Identifier: ${passIdentifier}`;
}

// Function to generate a unique passIdentifier
function generateUniquePassIdentifier() {
  // Implement your logic to generate a unique passIdentifier (e.g., using timestamps, random numbers, etc.)
  // For simplicity, let's use the current timestamp in milliseconds
  return Date.now().toString();
}


// Function to issue a visitor pass
async function issueVisitorPass(client, securityData, visitorData) {
  const recordsCollection = client.db('assignment').collection('Records');

  // Check if the visitor already has a pass issued
  const existingRecord = await recordsCollection.findOne({ icNumber: visitorData.icNumber, checkOutTime: null });

  if (existingRecord) {
    return 'Visitor already has an active pass. Cannot issue another pass until checked out.';
  }

  // Generate a unique passIdentifier for the visitor pass
  const passIdentifier = generateUniquePassIdentifier();

  const currentCheckInTime = new Date();

  const recordData = {
    icNumber: visitorData.icNumber,
    passIdentifier: passIdentifier,
    name: visitorData.name,
    company: visitorData.company,
    vehicleNumber: visitorData.vehicleNumber,
    purpose: visitorData.purpose,
    checkInTime: currentCheckInTime,
    issuedBy: securityData.username // Add the issuedBy information
  };

  // Insert the visitor record into the database
  await recordsCollection.insertOne(recordData);

  return `Visitor pass issued successfully. Pass Identifier: ${passIdentifier}`;
}

// Function to generate a unique passIdentifier
function generateUniquePassIdentifier() {
  // Implement your logic to generate a unique passIdentifier (e.g., using timestamps, random numbers, etc.)
  // For simplicity, let's use the current timestamp in milliseconds
  return Date.now().toString();
}


/**
 * @swagger
 * /registerHost:
 *   post:
 *     summary: Register a new host
 *     description: Register a new host with required details
 *     tags:
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               icNumber:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *               - name
 *               - phoneNumber
 *               - icNumber
 *     responses:
 *       '200':
 *         description: Host registration successful
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
app.post('/registerHost', verifyToken, async (req, res) => {
  let hostData = req.body;
  hostData.role = 'host'; // Add role information
  res.send(await registerHost(client, hostData));
});

// Function to handle host registration with password hashing
async function registerHost(client, hostData) {
  const hashedPassword = await bcrypt.hash(hostData.password, 10);

  const result = await client
    .db('assignment')
    .collection('Hosts')
    .insertOne({
      username: hostData.username,
      password: hashedPassword, // Store the hashed password
      name: hostData.name,
      phoneNumber: hostData.phoneNumber,
      icNumber: hostData.icNumber, // Add IC number information
      role: hostData.role, // Add the role information
    });

  return 'Host registration successful';
}



// Swagger documentation for the new endpoint
/**
 * @swagger
 * /loginHost:
 *   post:
 *     summary: Log in as host
 *     description: Log in as host with valid credentials
 *     tags:
 *       - Host
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *     responses:
 *       '200':
 *         description: Host login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Authentication token for the logged-in host
 *       '401':
 *         description: Unauthorized - Invalid credentials
 */

app.post('/loginHost', async (req, res) => {
  let data = req.body;
  try {
    const result = await loginHost(client, data);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

async function loginHost(client, data) {
  // Implement your authentication logic here
  // For example, you can query the MongoDB collection to verify credentials

  const collectionHosts = client.db('assignment').collection('Hosts');
  const host = await collectionHosts.findOne({ username: data.username });

  if (host) {
    // Compare the provided password with the stored hashed password
    const passwordMatch = await bcrypt.compare(data.password, host.password);

    if (passwordMatch) {
      // Authentication successful, generate JWT token
      const token = generateToken(host);
      return { token: token };
    } else {
      // Password does not match
      throw new Error('Invalid credentials');
    }
  } else {
    // Username not found
    throw new Error('Invalid credentials');
  }
}

/**
 * @swagger
 * /issueVisitorPass:
 *   post:
 *     summary: Issue a visitor pass
 *     description: Issue a visitor pass for a visitor without creating a visitor account
 *     tags:
 *       - Host
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               icNumber:
 *                 type: string
 *               purpose:
 *                 type: string
 *             required:
 *               - name
 *               - icNumber
 *               - purpose
 *     responses:
 *       '200':
 *         description: Visitor pass issued successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
app.post('/issueVisitorPass', verifyToken, async (req, res) => {
  let hostData = req.user;
  let visitorData = req.body;

  // Create a visitor record without creating a visitor account
  const result = await issueVisitorPass(client, hostData, visitorData);

  res.send(result);
});

// Function to issue a visitor pass
async function issueVisitorPass(client, hostData, visitorData) {
  const recordsCollection = client.db('assignment').collection('Records');

  // Check if the visitor already has a pass issued
  const existingRecord = await recordsCollection.findOne({ icNumber: visitorData.icNumber, checkOutTime: null });

  if (existingRecord) {
    return 'Visitor already has an active pass. Cannot issue another pass until checked out.';
  }

  // Generate a unique passIdentifier for the visitor pass
  const passIdentifier = generateUniquePassIdentifier();

  const currentCheckInTime = new Date();

  const recordData = {
    icNumber: visitorData.icNumber,
    passIdentifier: passIdentifier,
    name: visitorData.name,
    purpose: visitorData.purpose,
    checkInTime: currentCheckInTime,
    issuedBy: hostData.username // Add the issuedBy information (host instead of security)
  };

  // Insert the visitor record into the database
  await recordsCollection.insertOne(recordData);

  return `Visitor pass issued successfully by ${hostData.username}. Pass Identifier: ${passIdentifier}`;
}

 
 
 /**
 * @swagger
 * /viewAllVisitors:
 *   get:
 *     summary: View all visitor records
 *     description: View all records in the collection
 *     tags:
 *       - Host
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: All visitor records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   icNumber:
 *                     type: string
 *                   passIdentifier:
 *                     type: string
 *                   name:
 *                     type: string
 *                   purpose:
 *                     type: string
 *                   checkInTime:
 *                     type: string
 *                   issuedBy:
 *                     type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
app.get('/viewAllVisitors', verifyToken, async (req, res) => {
  // Ensure that the user is a host
  const hostData = req.user;
  if (hostData.role !== 'host') {
    return res.status(401).json({ error: 'Unauthorized - Only hosts can view all visitors' });
  }

  // Retrieve all visitor records from the collection
  const allVisitors = await getAllVisitors(client);

  res.status(200).json(allVisitors);
});

// Function to retrieve all visitor records from the collection
async function getAllVisitors(client) {
  const recordsCollection = client.db('assignment').collection('Records');

  // Retrieve all visitor records from the collection
  const allVisitors = await recordsCollection.find().toArray();

  return allVisitors;
}




 



 
 

}

run().catch(console.error);

//To generate token
function generateToken(userProfile){
  return jwt.sign(
  userProfile,    //this is an obj
  'dinpassword',           //password
  { expiresIn: '2h' });  //expires after 2 hour
}

//Function to register admin
async function registerAdmin(client, data) {
  data.password = await encryptPassword(data.password);
  
  const existingUser = await client.db("assignment").collection("Admin").findOne({ username: data.username });
  if (existingUser) {
    return 'Username already registered';
  } else {
    const result = await client.db("assignment").collection("Admin").insertOne(data);
    return 'Admin registered';
  }
}


//Function to login
async function login(client, data) {
  const adminCollection = client.db("assignment").collection("Admin");
  const securityCollection = client.db("assignment").collection("Security");
  const usersCollection = client.db("assignment").collection("Users");

  // Find the admin user
  let match = await adminCollection.findOne({ username: data.username });

  if (!match) {
    // Find the security user
    match = await securityCollection.findOne({ username: data.username });
  }

  if (!match) {
    // Find the regular user
    match = await usersCollection.findOne({ username: data.username });
  }

  if (match) {
    // Compare the provided password with the stored password
    const isPasswordMatch = await decryptPassword(data.password, match.password);

    if (isPasswordMatch) {
      console.clear(); // Clear the console
      const token = generateToken(match);
      console.log(output(match.role));
      return "\nToken for " + match.name + ": " + token;
    }
     else {
      return "Wrong password";
    }
  } else {
    return "User not found";
  }
}



//Function to encrypt password
async function encryptPassword(password) {
  const hash = await bcrypt.hash(password, saltRounds); 
  return hash 
}


//Function to decrypt password
async function decryptPassword(password, compare) {
  const match = await bcrypt.compare(password, compare)
  return match
}


//Function to register security and visitor
async function register(client, data, mydata) {
  const adminCollection = client.db("assignment").collection("Admin");
  const securityCollection = client.db("assignment").collection("Security");
  

  const tempAdmin = await adminCollection.findOne({ username: mydata.username });
  const tempSecurity = await securityCollection.findOne({ username: mydata.username });
  

  if (tempAdmin || tempSecurity || tempUser) {
    return "Username already in use, please enter another username";
  }

  if (data.role === "Admin") {
    const result = await securityCollection.insertOne({
      username: mydata.username,
      password: await encryptPassword(mydata.password),
      name: mydata.name,
      email: mydata.email,
      phoneNumber: mydata.phoneNumber,
      role: "Security",
      visitors: [],
    });

    return "Security registered successfully";
  }

  if (data.role === "Security") {
    const result = await usersCollection.insertOne({
      username: mydata.username,
      password: await encryptPassword(mydata.password),
      name: mydata.name,
      email: mydata.email,
      
      Security: data.username,
      company: mydata.company,
      vehicleNumber: mydata.vehicleNumber,
      icNumber: mydata.icNumber,
      phoneNumber: mydata.phoneNumber,
      role: "Visitor",
      records: [],
    });

    const updateResult = await securityCollection.updateOne(
      { username: data.username },
      { $push: { visitors: mydata.username } }
    );

    return "Visitor registered successfully";
  }
}




//Function to output
function output(data) {
  if(data == 'Admin') {
    return "You are logged in as Admin\n1)register Security\n2)read all data"
  } else if (data == 'Security') {
    return "You are logged in as Security\n1)register Visitor\n2)read security and visitor data"
  } else if (data == 'Visitor') {
    return "You are logged in as Visitor\n1)check in\n2)check out\n3)read visitor data\n4)update profile\n5)delete account"
  }
}



//to verify JWT Token
function verifyToken(req, res, next) {
  let header = req.headers.authorization;

  if (!header) {
    return res.status(401).send('Unauthorized');
  }

  let token = header.split(' ')[1];

  jwt.verify(token, 'dinpassword', function(err, decoded) {
    if (err) {
      console.error(err);
      return res.status(401).send('Invalid token');
    }

    req.user = decoded;
    next();
  });
}

