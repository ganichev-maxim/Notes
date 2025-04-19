module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db) {
    db.collection("notes").createSearchIndex(
      {
        name: "notes-search",
        definition: {
          "mappings": {
            "dynamic": false,
            "fields": {
              "userId": {
                "type": "token"
              },
              "isArchived": {
                "type": "boolean"
              },
              "created": {
                "type": "number"
              },
              "title": {
                "type": "string",
                "analyzer": "indexAnalyzer",
                "searchAnalyzer": "queryFilter"
              }
            }
          },
          "analyzers": [
            {
              "charFilters": [
                {
                  "type": "icuNormalize"
                }
              ],
              "name": "queryFilter",
              "tokenFilters": [],
              "tokenizer": {
                "type": "standard"
              }
            },
            {
              "charFilters": [],
              "name": "indexAnalyzer",
              "tokenFilters": [
                {
                  "type": "icuFolding"
                }
              ],
              "tokenizer": {
                "maxGram": 15,
                "minGram": 2,
                "type": "nGram"
              }
            }
          ]
        }
      }
    )
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db) {
    db.collection("notes").dropSearchIndex("notes-search");
  }
};
