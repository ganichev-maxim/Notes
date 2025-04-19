require("dotenv").config();
const { hash, compare } = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
const { addMonths } = require("date-fns");
const demo = require("./demo");
const resultsPerPage = 20;

const saltRounds = 10;

const clientPromise = MongoClient.connect(process.env.DB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
});

function getConnection() {
  return clientPromise.then((client) => client.db("notes"));
}

function getUserByLogin(login) {
  return getConnection().then((db) => db.collection("users").findOne({ login }));
}

function getUserById(id) {
  return getConnection().then((db) => db.collection("users").findOne({ _id: new ObjectId(id) }));
}

async function createUser(login, username, password) {
  let response;
  if (password) {
    response = await hash(password, saltRounds).then(function (hash) {
      return getConnection().then((db) => db.collection("users").insertOne({ login, username, password: hash }));
    });
  } else {
    response = await getConnection().then((db) => db.collection("users").insertOne({ username }));
  }
  if (response.insertedId) {
    await addNote(response.insertedId.toString(), demo.title, demo.text);
  }
  return response;
}

async function login(login, password) {
  const { password: passwordHash, ...rest} = await getUserByLogin(login);
  const isValidPassword = await compare(password, passwordHash)
  if (!isValidPassword) {
      throw new Error("Invalid password");
  }
  return rest;
}

async function getNotes(userId, age, search, page = 1) {
  const filter = getFilter(userId, age, search);

  const result = await getConnection().then((db) => db.collection("notes").aggregate(
    [
      {
        $search: {
          "index": "notes-search",
          "compound": {
            "must": filter
          },
          "highlight": {
            "path": "title"
          }
        }
      },
      {
        $project: {
          "_id": 1,
          "created": 1,
          "title": 1,
          "highlights": { "$meta": "searchHighlights" }
        }
      }
    ]
  )
    .sort({ created: -1 })
    .skip((page - 1) * resultsPerPage)
    .limit(resultsPerPage + 1)
    .toArray());

  return {
    data: result.slice(0, resultsPerPage).map(r => {
      if (r.highlights && r.highlights.length === 1) {
        const highlights = r.highlights[0];
        let resultTitle = "";
        for (const text of highlights.texts) {
          if (text.type === 'hit') {
            resultTitle += `<mark>${text.value}</mark>`;
          } else {
            resultTitle += text.value;
          }
        }
        r.highlights = resultTitle;
      } else {
        delete r.highlights;
      }
      return r;
    }),
    hasMore: result.length > resultsPerPage
  };
}

function getFilter(userId, age, search) {
  const filter = [
    {
      "equals": {
        "path": "userId",
        "value": userId,
      },
    },
    {
      "equals": {
        "path": "isArchived",
        "value": age === "archive",
      },
    }
  ];

  if (age.includes("month")) {
    const month = - parseInt(age.substring(0, age.indexOf('month')));
    filter.push({
      "range": {
        "path": "created",
        "gte": addMonths(Date.now(), month).getTime()
      }
    });
  }

  if (search) {
    filter.push({
      "text": {
        "path": "title",
        "query": search
      }
    });
  }

  return filter;
}

async function addNote(userId, title, text) {
  return getConnection()
    .then((db) =>
      db.collection("notes").insertOne({
        userId,
        title,
        text,
        isArchived: false,
        created: Date.now()
      })
    )
    .then((response) => response.insertedId);
}

async function getNote(userId, id) {
  return await getConnection().then((db) => db.collection("notes")
    .findOne({ userId, _id: new ObjectId(id)}));
}

async function editNote(userId, id, title, text) {
  return getConnection()
    .then((db) =>
      db.collection("notes").findOneAndUpdate({
        userId, _id: new ObjectId(id)
      },
      {
        $set: {
          title,
          text,
        },
      })
    );
}

async function archiveNote(userId, id, isArchived) {
  return getConnection()
    .then((db) =>
      db.collection("notes").findOneAndUpdate({
        userId, _id: new ObjectId(id)
      },
      {
        $set: {
          isArchived
        },
      })
    );
}

async function deleteNote(userId, id) {
  return getConnection()
    .then((db) =>
      db.collection("notes").deleteOne({
        userId, _id: new ObjectId(id)
      })
    );
}

async function deleteArchive(userId) {
  return getConnection()
    .then((db) =>
      db.collection("notes").deleteMany({
        userId,
        isArchived: true
      })
    );
}

function getCredentionals(provider, subject) {
  return getConnection().then((db) => db.collection("credentionals").findOne({ provider, subject }));
}

function createCredentionals(userId, provider, subject) {
   return getConnection().then((db) => db.collection("credentionals").insertOne({ userId, provider, subject }));
}

module.exports = {
  login,
  createUser,
  getUserByLogin,
  getNotes,
  addNote,
  getNote,
  editNote,
  archiveNote,
  deleteNote,
  deleteArchive,
  getCredentionals,
  createCredentionals,
  getUserById
};
