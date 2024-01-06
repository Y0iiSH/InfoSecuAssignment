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
 * /readAllData:
 *   get:
 *     summary: Read all data from the database
 *     description: Get all data from the database (requires admin token)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: All data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 admins:
 *                   type: array
 *                   description: List of admin details
 *                   items:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                         format: email
 *                       phoneNumber:
 *                         type: string
 *                       role:
 *                         type: string
 *                 securityPersonnel:
 *                   type: array
 *                   description: List of security personnel details
 *                   items:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                         format: email
 *                       phoneNumber:
 *                         type: string
 *                       role:
 *                         type: string
 *                       visitors:
 *                         type: array
 *                         description: List of visitors associated with the security personnel
 *                         items:
 *                           type: string
 *                 visitors:
 *                   type: array
 *                   description: List of visitor details
 *                   items:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                         format: email
 *                       phoneNumber:
 *                         type: string
 *                       role:
 *                         type: string
 *                       records:
 *                         type: array
 *                         description: List of records associated with the visitor
 *                         items:
 *                           type: string
 *                 records:
 *                   type: array
 *                   description: List of all records
 *                   items:
 *                     type: object
 *                     properties:
 *                       recordID:
 *                         type: string
 *                       username:
 *                         type: string
 *                       purpose:
 *                         type: string
 *                       checkInTime:
 *                         type: string
 *                       checkOutTime:
 *                         type: string
 *     responses:
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
app.get('/readAllData', verifyAdminToken, async (req, res) => {
  res.send(await readAllData(client));
});

// Function to read all data from the database
async function readAllData(client) {
  const admins = await client.db('assignment').collection('Admin').find().toArray();
  const securityPersonnel = await client.db('assignment').collection('Security').find().toArray();
  const records = await client.db('assignment').collection('Records').find().toArray();

  return { admins, securityPersonnel, visitors, records };
}

// Middleware to verify admin token
function verifyAdminToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).send('Unauthorized');
  }

  const token = header.split(' ')[1];

  jwt.verify(token, 'dinpassword', function(err, decoded) {
    if (err || decoded.role !== 'Admin') {
      console.error(err);
      return res.status(401).send('Invalid or insufficient admin token');
    }

    req.user = decoded;
    next();
  });
}

/**
 * @swagger
 * /deleteUser:
 *   delete:
 *     summary: Delete a visitor or security personnel by IC number and role
 *     description: Delete a user (visitor or security personnel) by providing IC number and role (requires admin token)
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
 *         description: Role of the user to be deleted (visitor or security)
 *         schema:
 *           type: string
 *           enum:
 *             - visitor
 *             - security
 *     responses:
 *       '200':
 *         description: User deleted successfully
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 *       '404':
 *         description: User not found
 *       '500':
 *         description: Internal Server Error
 */
app.delete('/deleteUser', verifyAdminToken, async (req, res) => {
  const { icNumber, role } = req.query;

  try {
    const result = await deleteUser(client, icNumber, role);

    if (result.deletedCount > 0) {
      res.status(200).send('User deleted successfully');
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
  const collectionName = role === 'visitor' ? 'Records' : 'Security';

  return await client
    .db('assignment') // Corrected the typo in the database name
    .collection(collectionName)
    .deleteOne({ icNumber });
}



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
  let data = req.user;
  let mydata = req.body;
  res.send(await registerSecurity(client, data, mydata));
});

async function registerSecurity(client, data, mydata) {
  const result = await client
    .db('assignment')
    .collection('Security')
    .insertOne({
      username: mydata.username,
      password: mydata.password,
      name: mydata.name,
      email: mydata.email,
      phoneNumber: mydata.phoneNumber,
      icNumber: mydata.icNumber,  // Ensure icNumber is included
      role: mydata.role,
    });

  return 'Security personnel registration successful';
}


 /**
 * @swagger
 * /getSecurityContact:
 *   get:
 *     summary: Get the contact number of the security from the given visitor pass
 *     description: Get the contact number of the security personnel who issued the provided visitor pass (requires admin token)
 *     tags:
 *       - Admin
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
 *         description: Security contact retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 securityName:
 *                   type: string
 *                 contactNumber:
 *                   type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 *       '404':
 *         description: Visitor pass not found or security information not available
 */
app.get('/getSecurityContact', verifyAdminToken, async (req, res) => {
  const { passIdentifier } = req.query;
  const securityInfo = await getSecurityContact(client, passIdentifier);

  if (securityInfo) {
    res.status(200).json(securityInfo);
  } else {
    res.status(404).send('Visitor pass not found or security information not available');
  }
});

// Function to get security information by issuedBy (assuming it's the username)
async function getSecurityInfo(client, issuedBy) {
  const securityInfo = await client
    .db('assignment')  // Ensure the correct database name is used
    .collection('Security')
    .findOne({ username: issuedBy });  // Assuming issuedBy corresponds to the security username

  return securityInfo;
}


// Function to get security contact by visitor pass ID
async function getSecurityContact(client, passIdentifier) {
  try {
    const visitorPass = await client
      .db('assignment')
      .collection('Records')
      .findOne({ passIdentifier });

    if (visitorPass && visitorPass.issuedBy) {
      // Assuming the security personnel's name is stored in the `issuedBy` field
      const securityInfo = await client
        .db('assignment')
        .collection('Security')
        .findOne({ username: visitorPass.issuedBy });

      if (securityInfo && securityInfo.phoneNumber) {
        return {
          securityName: securityInfo.username,
          contactNumber: securityInfo.phoneNumber,
        };
      } else {
        console.error('Security information not found or missing phoneNumber field.');
      }
    } else {
      console.error('Visitor pass not found or missing issuedBy field.');
    }
  } catch (error) {
    console.error('Error fetching security information:', error);
  }

  return null;
}


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
  res.send(await login(client, data));
});


/**
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
 *                 company:
 *                   type: string
 *                 vehicleNumber:
 *                   type: string
 *                 purpose:
 *                   type: string
 *                 checkInTime:
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
      company: passInfo.company,
      vehicleNumber: passInfo.vehicleNumber,
      purpose: passInfo.purpose,
      checkInTime: passInfo.checkInTime.toISOString() // Adjust the format as needed
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
 * /readAdmin:
 *   get:
 *     summary: Read admin details
 *     description: Get details of the logged-in admin
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Admin details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                   description: Username of the admin
 *                 name:
 *                   type: string
 *                   description: Name of the admin
 *                 email:
 *                   type: string
 *                   format: email
 *                   description: Email of the admin
 *                 phoneNumber:
 *                   type: string
 *                   description: Phone number of the admin
 *                 role:
 *                   type: string
 *                   description: Role of the admin
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */

  app.get('/readAdmin', verifyToken, async (req, res) => {
    let data = req.user;
    res.send(await read(client, data));
  });

 
 




/**
 * @swagger
 * /registerHost:
 *   post:
 *     summary: Register a new host
 *     description: Register a new host with required details
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
 *                   - Host
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
 *         description: Host registration successful
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
app.post('/registerHost', verifyToken, async (req, res) => {
  let data = req.user;
  let mydata = req.body;
  res.send(await registerHost(client, data, mydata));
});

async function registerHost(client, data, mydata) {
  const result = await client
    .db('assignment')
    .collection('Host')
    .insertOne({
      username: mydata.username,
      password: mydata.password,
      name: mydata.name,
      email: mydata.email,
      phoneNumber: mydata.phoneNumber,
      icNumber: mydata.icNumber,  // Ensure icNumber is included
      role: mydata.role,
    });

  return 'Host registration successful';
}

/**
 * @swagger
 * /hostSeeAllRecords:
 *   get:
 *     summary: View all records as a host
 *     description: Retrieve all visitor records for a host
 *     tags:
 *       - Host
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         description: Host token (Bearer)
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved all records
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
 *                   company:
 *                     type: string
 *                   vehicleNumber:
 *                     type: string
 *                   purpose:
 *                     type: string
 *                   checkInTime:
 *                     type: string
 *                   issuedBy:
 *                     type: string
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 *       '500':
 *         description: Internal Server Error
 */

app.get('/hostSeeAllRecords', async (req, res) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).send('Unauthorized');
    }

    const token = header.split(' ')[1];

    jwt.verify(token, 'yourHostTokenSecret', async function (err, decoded) {
      if (err || decoded.role !== 'host') {
        console.error(err);
        return res.status(401).send('Invalid or insufficient host token');
      }

      const hostData = decoded; // Details of the host from the token

      // Retrieve all records for the host
      const records = await getAllRecordsForHost(client, hostData);

      res.status(200).json(records);
    });
  } catch (error) {
    console.error('Error retrieving records:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Function to retrieve all records for a host
async function getAllRecordsForHost(client, hostData) {
  const recordsCollection = client.db('assignment').collection('Records');

  // Retrieve all records where the host is the issuer
  const records = await recordsCollection.find({ issuedBy: hostData.username }).toArray();

  return records;
}




/**
 * @swagger
 * /loginHost:
 *   post:
 *     summary: Log in as host
 *     description: Log in as host 
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
 *                   description: Authentication token for the logged-in host personnel
 *       '401':
 *         description: Unauthorized - Invalid credentials
 */
app.post('/loginHost', async (req, res) => {
  let data = req.body;
  res.send(await login(client, data));
});

  /**
 * @swagger
 * /readSecurity:
 *   get:
 *     summary: Read security personnel details
 *     description: Get details of the logged-in security personnel
 *     tags:
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Security personnel details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                   description: Username of the security personnel
 *                 name:
 *                   type: string
 *                   description: Name of the security personnel
 *                 email:
 *                   type: string
 *                   format: email
 *                   description: Email of the security personnel
 *                 phoneNumber:
 *                   type: string
 *                   description: Phone number of the security personnel
 *                 role:
 *                   type: string
 *                   description: Role of the security personnel
 *       '401':
 *         description: Unauthorized - Token is missing or invalid
 */
  app.get('/readSecurity', verifyToken, async (req, res) => {
    let data = req.user;
    res.send(await read(client, data));
  });




 
 

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
  const hostCollection = client.db("assignment").collection("Host");

  // Find the admin user
  let match = await adminCollection.findOne({ username: data.username });

  if (!match) {
    // Find the security user
    match = await securityCollection.findOne({ username: data.username });
  }

  if (!match) {
    // Find the host user
    match = await hostCollection.findOne({ username: data.username });
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


//Function to register security, visitor, and host
async function register(client, data, mydata) {
  const adminCollection = client.db("assignment").collection("Admin");
  const securityCollection = client.db("assignment").collection("Security");
  const hostCollection = client.db("assignment").collection("Host");

  const tempAdmin = await adminCollection.findOne({ username: mydata.username });
  const tempSecurity = await securityCollection.findOne({ username: mydata.username });
  const tempHost = await hostCollection.findOne({ username: mydata.username });

  if (tempAdmin || tempSecurity || tempHost) {
    return "Username already in use, please enter another username";
  }

  if (data.role === "Admin") {
    const result = await adminCollection.insertOne({
      username: mydata.username,
      password: await encryptPassword(mydata.password),
      name: mydata.name,
      email: mydata.email,
      phoneNumber: mydata.phoneNumber,
      role: "Admin",
    });

    return "Admin registered successfully";
  }

  if (data.role === "Security") {
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

  if (data.role === "Visitor") {
    const result = await securityCollection.insertOne({
      username: mydata.username,
      password: await encryptPassword(mydata.password),
      name: mydata.name,
      email: mydata.email,
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

  if (data.role === "Host") {
    const result = await hostCollection.insertOne({
      username: mydata.username,
      password: await encryptPassword(mydata.password),
      name: mydata.name,
      email: mydata.email,
      phoneNumber: mydata.phoneNumber,
      role: "Host",
    });

    return "Host registered successfully";
  }
}

// Function to encrypt password (you need to implement this function)
async function encryptPassword(password) {
  // Implement your password encryption logic here
  // For example, you can use bcrypt
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}






//Function to read data
async function read(client, data) {
  if (data.role == 'Admin') {
    const Admins = await client.db('assignment').collection('Admin').find({ role: 'Admin' }).next();
    const Securitys = await client.db('assignment').collection('Security').find({ role: 'Security' }).toArray();
    const Visitors = await client.db('assignment').collection('Users').find({ role: 'Visitor' }).toArray();
    const Records = await client.db('assignment').collection('Records').find().toArray();

    return { Admins, Securitys, Visitors, Records };
  }

  if (data.role == 'Security') {
    const Security = await client.db('assignment').collection('Security').findOne({ username: data.username });
    if (!Security) {
      return 'User not found';
    }

    const Visitors = await client.db('assignment').collection('Users').find({ Security: data.username }).toArray();
    const Records = await client.db('assignment').collection('Records').find().toArray();

    return { Security, Visitors, Records };
  }

  if (data.role == 'Visitor') {
    const Visitor = await client.db('assignment').collection('Users').findOne({ username: data.username });
    if (!Visitor) {
      return 'User not found';
    }

    const Records = await client.db('assignment').collection('Records').find({ recordID: { $in: Visitor.records } }).toArray();

    return { Visitor, Records };
  }
}





//Function to check in
async function checkIn(client, data, mydata) {
  const usersCollection = client.db('assignment').collection('Users');
  const recordsCollection = client.db('assignment').collection('Records');

  const currentUser = await usersCollection.findOne({ username: data.username });

  if (!currentUser) {
    return 'User not found';
  }

  if (currentUser.currentCheckIn) {
    return 'Already checked in, please check out first!!!';
  }

  if (data.role !== 'Visitor') {
    return 'Only visitors can access check-in.';
  }

  const existingRecord = await recordsCollection.findOne({ recordID: mydata.recordID });

  if (existingRecord) {
    return `The recordID '${mydata.recordID}' is already in use. Please enter another recordID.`;
  }

  const currentCheckInTime = new Date();

  const recordData = {
    username: data.username,
    recordID: mydata.recordID,
    purpose: mydata.purpose,
    checkInTime: currentCheckInTime
  };

  await recordsCollection.insertOne(recordData);

  await usersCollection.updateOne(
    { username: data.username },
    {
      $set: { currentCheckIn: mydata.recordID },
      $push: { records: mydata.recordID }
    }
  );

  return `You have checked in at '${currentCheckInTime}' with recordID '${mydata.recordID}'`;
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

