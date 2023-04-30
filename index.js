const app = require("express")();
const { Pool } = require('pg');
const { DateTime } = require('luxon')
const cors = require('cors')

app.use(cors())

// Create a new Pool instance with the connection details
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'testdb_jasyd',
    password: 'postgres',
    port: 5432, // default PostgreSQL port
});

const delay = async (delay) =>
    new Promise((resolve, reject) => setTimeout(() => resolve(), delay))


const getBalanceByDate = async (product, date) => {
    const query = `select sum(case when type = 'CI' then value else -value end) balance 
        from ${product} where date = '${date}'`

    const [result] = (await pool.query(query)).rows

    await delay(100)
    return Number(result.balance)
}

app.get('/', async (req, res) => {
    let iDate = DateTime.fromSQL('2022-01-01')
    const endDate = DateTime.fromSQL('2022-02-01')

    while (!iDate.equals(endDate)) {
        console.log(iDate.toSQLDate())
        iDate = iDate.plus({ days: 1 })
    }
    console.log('cdt', await getBalanceByDate('cdt', '2022-11-30'))
    console.log('fics', await getBalanceByDate('fics', '2022-11-30'))
    console.log('fpv', await getBalanceByDate('fpv', '2022-11-30'))

    res.send('hello!')
})

const sendData = async (res, date, value) => {
    res.write('data: ' + `${JSON.stringify({ date, value })}\n\n`)
}

let i = 0
app.get('/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    const startDate = DateTime.fromSQL(req.query.startDate)
    const endDate = DateTime.fromSQL(req.query.endDate);
    let iDate = startDate


    console.time('time stream')
    while (!iDate.equals(endDate)) {
        // console.log(iDate.toSQLDate())

        const cdtBalance = await getBalanceByDate('cdt', iDate.toSQLDate())
        // await sendData(res, iDate.toSQLDate(), cdtBalance)

        const ficsBalance = await getBalanceByDate('fics', iDate.toSQLDate())
        // await sendData(res, iDate.toSQLDate(), ficsBalance)

        const fpvBalance = await getBalanceByDate('fpv', iDate.toSQLDate())
        await sendData(res, iDate.toSQLDate(), fpvBalance + cdtBalance + ficsBalance)

        iDate = iDate.plus({ days: 1 })
    }
    console.timeEnd('time stream')
})

app.get('/without', async (req, res) => {
    const startDate = DateTime.fromSQL(req.query.startDate)
    const endDate = DateTime.fromSQL(req.query.endDate);
    let iDate = startDate

    result = {}

    console.time('time without')
    while (!iDate.equals(endDate)) {
        // console.log(iDate.toSQLDate())
        const currentDate = iDate.toSQLDate()

        result[currentDate] = await getBalanceByDate('cdt', iDate.toSQLDate())
        result[currentDate] += await getBalanceByDate('fics', iDate.toSQLDate())
        result[currentDate] += await getBalanceByDate('fpv', iDate.toSQLDate())

        iDate = iDate.plus({ days: 1 })
    }
    console.timeEnd('time without')

    console.log(result)
    res.status(200).send(result)
})

app.listen(8000)
console.log('Listening on port 8000')

// Don't forget to end the pool when your app shuts down
process.on('SIGINT', () => {
    pool.end();
});