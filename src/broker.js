const mosca = require('mosca');
const http = require('https');
const mqtt = require('mqtt');
const topics = require("../src/storage/topics.json")
const moment = require('moment');

const ip = "192.168.5.73";

const topicRecord = 'record';
const topicAdd = 'addProduct';
const topicCharger = 'charger';
const topicPerformance = 'performance';
const topicQuality = 'qualityProduct';
const topicTemperatura = "temperaturaReactor";
const topicMaterial = "materiaPrima";
const topicProduct = "addProduct";

// AWS
const optionsAWS = {
    hostname: 'keb6atfcl0.execute-api.us-east-1.amazonaws.com',
    port: 443,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
}

const reqAWS = () => {
    return http.request(optionsAWS, res => {
        console.log(`\nHTTP: Status: ${res.statusCode} ${res.statusMessage}`)
        res.on('data', d => {
            console.log(`\nAWS responde desde ${optionsAWS.path}`)
            process.stdout.write(d)
        })
    })
}

// MQTT
const settings = {port: 1234}
const broker = new mosca.Server(settings)

broker.on('published', (packet) => {
    topic = packet.topic;
    message = packet.payload;
    // console.clear();
    console.log(`MQTT:Desde el topic '${topic}', se envia el mensaje\n${message}`);

    if (topics[topic]) {
        optionsAWS.path = topics[topic];
    } else {
        console.log("El topic es incorrecto")
    }
})

const hostMQTT = `mqtt://${ip}:1234`;
const client = mqtt.connect(hostMQTT);

function connectMQTT(){
    client.on('connect', ()=>{
        client.subscribe(topicRecord);
        client.subscribe(topicAdd);
        client.subscribe(topicCharger);
        client.subscribe(topicPerformance);
        client.subscribe(topicQuality);

        client.subscribe(topicTemperatura)
        client.subscribe(topicMaterial)
        client.subscribe(topicProduct);
        // client.subscribe(topicPerformance);
    })
}

function messageMQTT(){
    // moment.locale("en")
    client.on('message', (topic, message) => {

        let data = message.toString().split("-");
        let lote = `L${data[0]}`
        let id = `${moment().format("YYDDDHHmmss")}`;
        let time = moment().format("DD-MMMM-YYYY HH:mm:ss");

        switch (topic) {
            case topicTemperatura:
                message = {
                    "id": id,
                    "temperatura": data[1],
                    "time_proceso": time,
                    "Lote": lote,
                    "topic": "record"
                }
                break;
            case topicMaterial:
                // console.log("El menaje recibido de la materia prime es ", data)
                let item = data[1].split("")
                message = {
                    "id": id,
                    "Materiaprima": data[1],
                    "responsable": data[3],
                    "catidad_kg" : data[2],
                    "time_proceso": time,
                    "Lote_Materiaprima": `${item[0]}${item[1]}${item[2]}${data[0]}`,
                    "Lote": lote,
                    "topic": "charger"
                }
                break;
            case topicProduct:
                message = {
                    "id": id,
                    "add_producto": data[1],
                    "catidad_kg": data[2],
                    "lote_add_producto": `L${data[3]}`,
                    "Lote": lote,
                    "topic": "addProduct"
                }
                break;
            case topicPerformance:
                message = {
                    "id": id,
                    "producto": data[2],
                    "Rendimiento_kg": data[1],
                    "time_proceso": time,
                    "Lote": lote,
                    "topic": "performance"
                }
                break;
            case topicQuality:
                message = {
                    "id": id,
                    "producto": data[2],
                    "Quality": data[1],
                    "time_proceso": time,
                    "Lote": lote,
                    "topic": "qualityproduct"
                }
                break;
            default:
                console.log(`\n%c${'Datos incorrectos, FAIL'}`)
                break;
        }

        // console.log(message)
        // data = JSON.parse(message);
        // data.topic = topic;
        
        req = reqAWS();          
        req.on('error', error => {
            console.error(error)
        })
        req.write(JSON.stringify(message))
        req.end()
        console.log(message)
        // data = message.toString();
        console.log(message.topic)
    })
}

//Servidor HTTP
const hostHTTP = ip;
const portHTTP = 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    // res.setHeader('Content-Type', 'text/plain');
    // res.end('Hola mundo')
})

server.listen(portHTTP, hostHTTP, () => {
    console.log('Servidor funcionando en', hostHTTP, portHTTP);
    messageMQTT();
    connectMQTT();
})