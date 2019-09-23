const crypto = require('crypto')
const path = require('path')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')
const db = require('./db') // mongo logic

const SECRET = process.env.SECRET
const ENDPOINT_URL = process.env.ENDPOINT_URL

const hash_hmac = str => crypto.createHmac('sha256', SECRET).update(str).digest('hex')

const signatureCheck = (paramsArray, sign) => 
    sign ? hash_hmac(paramsArray.join('#')) === sign
        : false

app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(bodyParser.json())

app.get('/', async function (req, res) {
    if (await db.checkSession(req.query.session)) {
        return res.sendFile(path.join(__dirname, 'www', '/index.html'))
    }
    res.sendFile(path.join(__dirname, 'www', '/error.html'))
})

app.post('/', async function (req, res) {
    const POST = req.body
    if (!signatureCheck(
        [POST.balance, POST.casino, POST.currency, POST.game, POST.receiver, POST.uid],
        POST.sign)
    ) {
        return res.send({
            status: false,
            type: 'error'
        })
    }
    try {
        const sessionId = await db.createSession(POST)
        return res.send({
            status: true,
            type: 'success',
            url: ENDPOINT_URL + '/?session=' + sessionId
        })
    } catch (error) {
        console.trace(error)
        return res.send({
            status: false,
            type: 'something went wrong'
        })
    }
})

const clientData = user => ({
    uid: user.uid,
    balance: user.balance,
    currency: user.currency
})

const casinoBet = async (receiver, body) => {
    const { action, currency, game, microtime, session, user } = body
    const signData = [action, currency, game, microtime, session, user].join('#')
    return new Promise((resolve, reject) =>
        request.post(receiver,
            {
                headers: {
                    'X-SIGNATURE': hash_hmac(signData)
                },
                json: true,
                body
            },
            (err, res, body) => {
                try {
                    if (err) return reject(err)
                    const { user, balance, currency, sign, error } = body
                    if (!signatureCheck(
                        [user, balance, currency],
                        sign)
                    ) return reject(new Error('casino signature error'))
                    resolve({ user, balance, currency, error })
                } catch (e) {
                    reject(e)
                }
            }
        )
    )
}

app.post('/flip', async function (req, res) {
    const { session, bet } = req.body
    try {
        let userData = await db.checkSession(session)
        if (!userData) {
            return res.send({ error: 'Session not found!' })
        }

        if (bet <= 0) {
            return res.send(clientData(userData))
        }

        const isWon = Math.random() > 0.5

        const { user, balance, error } = await casinoBet(userData.receiver, {
            action: 'pushBet',
            currency: userData.currency,
            game: userData.game,
            microtime: Date.now(),
            session: userData.sessionId,
            user: userData.uid,
            amount: bet,
            won: isWon ? 2 * bet : 0,
            is_won: isWon
        })

        if (!isNaN(balance)) {
            await db.updateBalance(user, balance)
        }
        userData = await db.checkSession(session)
        res.send(clientData(userData))
    } catch (error) {
        console.trace(error)
        return res.send({ error: 'something went wrong' })
    }
})

db.connect(process.env.MONGO_URL, _ => app.listen(3000))
