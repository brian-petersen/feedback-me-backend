const express = require('express')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const cors = require('cors')
const multer = require('multer')

const app = express()
const upload = multer({ dest: 'uploads/' })

app.use(morgan('combined'))
app.use(cookieParser())
app.use(bodyParser.json())

const corsConfig = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))

const reviews = {}

app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({
        id: req.file.filename,
    })
})

app.get('/api/pdf/:id', (req, res) => {
    res.sendFile(req.params.id, {
        root: 'uploads/',
        headers: {
            'Content-Type': 'application/pdf',
        }
    }, (err) => {
        if (err) {
            res.sendStatus(404)
        }
    })
})

app.get('/api/feedback/:id', createSession, ensureSession, (req, res) => {
    const { id } = req.params
    const { reviewSession } = req.cookies

    if (!reviews.hasOwnProperty(id) || !reviews[id].hasOwnProperty(reviewSession)) {
        return res.json({})
    }

    res.json(reviews[id][reviewSession])
})

app.post('/api/feedback/:id', ensureSession, (req, res) => {
    const { id } = req.params
    const { reviewSession } = req.cookies

    if (!reviews.hasOwnProperty(id)) {
        reviews[id] = {}
    }

    reviews[id][reviewSession] = req.body

    res.sendStatus(200)
})

app.get('/api/review/:id', (req, res) => {
    const { id } = req.params

    if (!reviews.hasOwnProperty(id)) {
        return res.json([])
    }

    const keys = Object.keys(reviews[id])
    const feedbacks = keys.reduce((feedbacks, key) => {
        feedbacks.push(reviews[id][key])

        return feedbacks
    }, [])

    return res.json(feedbacks)
})

app.get('/api/status', (req, res) => {
    res.json({
        reviews,
    })
})

const port = process.env.PORT || 3001
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

function createSession(req, res, next) {
    const hasSession = Object.prototype.hasOwnProperty.call(req.cookies, 'reviewSession')

    if (!hasSession) {
        const id = makeId()
        res.cookie('reviewSession', id)
        req.cookies.reviewSession = id
    }

    next()
}

function ensureSession(req, res, next) {
    const hasSession = Object.prototype.hasOwnProperty.call(req.cookies, 'reviewSession')

    if (!hasSession) {
        return res.sendStatus(401)
    }

    next()
}

function makeId(length = 10) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    let text = ''
    for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
}
