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
            title: 'Vistor Management System',
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the reason for unauthorized access
 */
app.post('/loginAdmin', async (req, res) => {
  let data = req.body;
  try {
    const result = await loginAdmin(client, data);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
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
 *     summary: Delete a user by IC number and role (visitor, security or host)
 *     description: Delete a user (visitor, security personnel, or host) by providing IC number and role (requires admin token)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: icNumber
 *         required: true
 *         description: IC number of the user to be deleted 
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



// Swagger documentation for the new endpoint
/**
 * @swagger
 * /loginSecurity:
 *   post:
 *     summary: Log in as security personnel
 *     description: Log in as security personnel with valid credentials
 *     tags:
 *       - Security
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
 *         description: Security personnel login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Authentication token for the logged-in security personnel
 *       '401':
 *         description: Unauthorized - Invalid credentials
 */

app.post('/loginSecurity', async (req, res) => {
  let data = req.body;
  try {
    const result = await loginSecurity(client, data);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

async function loginSecurity(client, data) {
  // Implement your authentication logic here
  // For example, you can query the MongoDB collection to verify credentials

  const collectionSecurity = client.db('assignment').collection('Security');
  const security = await collectionSecurity.findOne({ username: data.username });

  if (security) {
    // Compare the provided password with the stored hashed password
    const passwordMatch = await bcrypt.compare(data.password, security.password);

    if (passwordMatch) {
      // Authentication successful, generate JWT token
      const token = generateToken(security);
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
 *         
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
 *                 hostPhoneNumber:  // Add the host's phone number
 *                   type: string
 *       '404':
 *         description: Visitor pass not found
 */
app.get('/retrieveVisitorPass', async (req, res) => {
  const icNumber = req.query.icNumber;

  // Retrieve visitor pass information using the provided IC number
  const passInfo = await retrieveVisitorPassByICNumber(client, icNumber);

  if (passInfo) {
    // Fetch host's phone number using the host's username
    const hostInfo = await getHostInfoByUsername(client, passInfo.issuedBy);

    res.json({
      passIdentifier: passInfo.passIdentifier,
      name: passInfo.name,
      purpose: passInfo.purpose,
      icNumber: passInfo.icNumber,
      checkInTime: passInfo.checkInTime.toISOString(),
      issuedBy: passInfo.issuedBy,
      hostPhoneNumber: hostInfo ? hostInfo.phoneNumber : 'N/A' // Display 'N/A' if host info not found
    });
  } else {
    res.status(404).send('Visitor pass not found');
  }
});

// Function to retrieve host information by username
async function getHostInfoByUsername(client, username) {
  const hostsCollection = client.db('assignment').collection('Hosts');
  const hostInfo = await hostsCollection.findOne({ username });

  return hostInfo;
}

// Function to retrieve visitor pass information by IC number
async function retrieveVisitorPassByICNumber(client, icNumber) {
  const recordsCollection = client.db('assignment').collection('Records');
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
 * /registerHost:
 *   post:
 *     summary: Register a host
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
 *                   - host
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
app.post('/registerHost', verifyToken, async (req, res) => {
  let mydata = req.body;
  res.send(await registerHost(client, mydata));
});


/**
 * @swagger
 * /test/registerHost:
 *   post:
 *     summary: Register a new host
 *     description: Register a new host with required details
 *     tags:
 *       - Security
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
 */
app.post('/test/registerHost', async (req, res) => {
  let hostData = req.body;
  hostData.role = 'host'; // Add role information
  res.send(await registerHost(client, hostData));
});



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

  // Retrieve all visitor records from the collection for the specific host
  const allVisitors = await getAllVisitors(client, hostData.username);

  res.status(200).json(allVisitors);
});


// Function to retrieve all visitor records from the collection
async function getAllVisitors(client, hostUsername) {
  const recordsCollection = client.db('assignment').collection('Records');

  // Retrieve all visitor records where issuedBy matches the host's username
  const allVisitors = await recordsCollection.find({ issuedBy: hostUsername }).toArray();

  return allVisitors;
}


/**
 * @swagger
 * /getHostPhoneNumber:
 *   get:
 *     summary: Get the contact number of the host from the given visitor pass
 *     description: Get the contact number of the host who issued the provided visitor pass (requires security token)
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
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 *       '404':
 *         description: Visitor pass not found or host information not available
 */


app.get('/getHostPhoneNumber', verifyToken, async (req, res) => {
  const { passIdentifier } = req.query;
  const hostInfo = await getHostContact(client, passIdentifier);

  if (hostInfo) {
    res.status(200).json(hostInfo);
  } else {
    res.status(404).send('Visitor pass not found or host information not available');
  }
});

// Function to get host information by issuedBy (assuming it's the username)
async function getHostInfo(client, issuedBy) {
  const hostInfo = await client
    .db('assignment')  
    .collection('Hosts')
    .findOne({ username: issuedBy });

  return hostInfo;
}

// Function to get host contact by visitor pass ID
async function getHostContact(client, passIdentifier) {
  try {
    const visitorPass = await client
      .db('assignment')
      .collection('Records')
      .findOne({ passIdentifier });

    if (visitorPass && visitorPass.issuedBy) {
      // Assuming the host's name is stored in the `issuedBy` field
      const hostInfo = await client
        .db('assignment')
        .collection('Hosts')
        .findOne({ username: visitorPass.issuedBy });

      if (hostInfo && hostInfo.phoneNumber) {
        return {
          hostName: hostInfo.username,
          contactNumber: hostInfo.phoneNumber,
        };
      } else {
        console.error('Host information not found or missing phoneNumber field.');
      }
    } else {
      console.error('Visitor pass not found or missing issuedBy field.');
    }
  } catch (error) {
    console.error('Error fetching host information:', error);
  }

  return null;
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

//register Admin
async function registerAdmin(client, data) {
  // Check for existing username
  const existingUser = await client.db("assignment").collection("Admin").findOne({ username: data.username });

  if (existingUser) {
    return 'Username already registered';
  }

  // Check if the provided password meets strong password criteria
  const passwordValidationResult = validatePasswordCriteria(data.password);

  if (passwordValidationResult) {
    return passwordValidationResult;
  }

  // Encrypt the password
  data.password = await encryptPassword(data.password);

  // Insert the new admin into the collection
  const result = await client.db("assignment").collection("Admin").insertOne(data);
  return 'Admin registered';
}


//register security
async function registerSecurity(client, data) {
  // Check for existing username
  const existingUser = await client.db("assignment").collection("Security").findOne({ username: data.username });

  if (existingUser) {
    return 'Username already registered';
  }

  // Check if the provided password meets strong password criteria
  const passwordValidationResult = validatePasswordCriteria(data.password);

  if (passwordValidationResult) {
    return passwordValidationResult;
  }

  // Encrypt the password
  data.password = await encryptPassword(data.password);

  // Insert the new security personnel into the collection
  const result = await client.db("assignment").collection("Security").insertOne(data);
  return 'Security personnel registered';
}

//register host
async function registerHost(client, data) {
  // Check for existing username
  const existingUser = await client.db("assignment").collection("Host").findOne({ username: data.username });

  if (existingUser) {
    return 'Username already registered';
  }

  // Check if the provided password meets strong password criteria
  const passwordValidationResult = validatePasswordCriteria(data.password);

  if (passwordValidationResult) {
    return passwordValidationResult;
  }

  // Encrypt the password
  data.password = await encryptPassword(data.password);

  // Insert the new security personnel into the collection
  const result = await client.db("assignment").collection("Hosts").insertOne(data);
  return 'Host registered';
}


async function loginAdmin(client, data) {
  // Implement your authentication logic here
  // For example, you can query the MongoDB collection to verify credentials

  const collectionAdmin = client.db('assignment').collection('Admin');
  const admin = await collectionAdmin.findOne({ username: data.username });

  if (admin) {
    // Compare the provided password with the stored hashed password
    const passwordMatch = await bcrypt.compare(data.password, admin.password);

    if (passwordMatch) {
      // Authentication successful, generate JWT token
      const token = generateToken(admin);
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



function validatePasswordCriteria(password) {
  const criteria = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    specialCharacter: /[!@#$%^&*()_+=\-[\]{};:'",.<>?/\\^_`|~]/.test(password),
  };

  const hasError = Object.values(criteria).some((criterion) => !criterion);

  if (hasError) {
    return {
      status: 'error',
      message: 'Password does not meet the criteria for a strong password',
      criteria: {
        minLength: 'At least 8 characters',
        uppercase: 'At least one uppercase letter',
        lowercase: 'At least one lowercase letter',
        digit: 'At least one digit',
        specialCharacter: 'At least one special character (e.g., !@#$%^&*())',
      },
    };
  }

  return null; // No error
}

