
var DateTime = luxon.DateTime;

const chart = new Chart("myChart", {
    type: "line",
    data: {
        datasets: [{
            data: [],
            backgroundColor: "rgba(0,0,255,1.0)",
            borderColor: "rgba(0,0,255,0.1)",
        }]
    },
    options: {
        scales: {
            y: { min: 180_000_000, max: 220_000_000 }
        },
        animation: {
            duration: 100
        }
    }
});


const startDate = '2022-01-01'
const endDate = '2022-01-30'

let iDate = DateTime.fromSQL(startDate)

const initializeChart = () => {
    while (!iDate.equals(DateTime.fromSQL(endDate))) {
        chart.data.datasets[0].data.push({ x: iDate.toSQLDate(), y: 0 })
        iDate = iDate.plus({ days: 1 })
    }
    chart.update()
}

const clearChart = () => {
    chart.data.datasets[0].data.forEach(item => {
        item.y = 0
    })
    chart.update()
}

initializeChart()

document.getElementById('clear').addEventListener('click', () => clearChart())


const withSSE = () => {
    const sse = new EventSource(`http://localhost:8000/stream?startDate=${startDate}&endDate=${endDate}`);

    sse.onmessage = (msg) => {
        console.log(JSON.parse(msg.data))
        const newData = JSON.parse(msg.data)
        const existingValue = chart.data.datasets[0].data.find(({ x }) => x === newData.date)

        if (existingValue) existingValue.y += newData.value
        else chart.data.datasets[0].data.push({ x: newData.date, y: newData.value })

        chart.update()
    }
}

const withoutSSE = () => {
    const route = `http://localhost:8000/without?startDate=${startDate}&endDate=${endDate}`
    fetch(route).then(res => res.json()).then(res => {
        chart.data.datasets[0].data = Object.entries(res).map(([date, value]) => ({ x: date, y: value }))
        chart.update()
    }).catch(console.error)
}

document.getElementById('with-sse').addEventListener('click', () => {
    clearChart()
    withSSE()
})
document.getElementById('without-sse').addEventListener('click', () => {
    clearChart()
    withoutSSE()
})