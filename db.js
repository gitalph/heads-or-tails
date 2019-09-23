const crypto = require('crypto')
const MongoClient = require('mongodb').MongoClient
const assert = require('assert')

const veryUniqueSession = () => crypto.createHash('md5').update(Date.now + '#' + Math.random()).digest('hex')

module.exports = class {
    static connect (uri, cb) {
        MongoClient.connect(uri, async (err, database) => {
            assert.strict.equal(null, err)
            this.db = database
            await this.db.createCollection('session')
            this.db.ensureIndex('session', 'sessionId')
            this.db.ensureIndex('session', 'uid')
            cb(database)
        })
    }

    static async checkSession (sessionId) {
        if (!sessionId) return false
        return this.db.collection('session').findOne({ sessionId })
    }

    static async updateBalance (userId, balance) {
        return this.db.collection('session').update(
            { 'uid': userId },
            { $set: { balance } },
            { multi: true }
        )
    }

    static async createSession (initData) {
        const sessionId = veryUniqueSession()
        const userData = { ...initData, sessionId }
        await this.db.collection('session').insertOne(userData)
        return sessionId
    }
}
