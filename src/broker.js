const mosca = require('mosca');
const http = require('https');
const mqtt = require('mqtt');
const topics = require("../src/storage/topics.json")

const topicRecord = 'record';
const topicAdd = 'addProduct';
const topicCharger = 'charger';
const topicPerformance = 'performance';
const topicQuality = 'qualityproduct';
const ip = "192.168.5.221";

// AWS
const optionsAWS = {
    hostname: 'keb6atfcl0.execute-api.us-east-1.amazonaws.com',
    port: 443,
    // path: '/prueba/handlerdata/qualityproduct',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
}

function selectTopic(topic){
    if (topics[topic]) {
        optionsAWS.path = topics[topic];
    } else {
        console.log(`\n%c${'El topic es incorrecto'}`)
    }
    // switch(topic){
    //     case topicRecord:
    //         optionsAWS.path = '/prueba/handlerdata/recordsprocess';
    //         break;
    //     case topicAdd:
    //         optionsAWS.path = '/prueba/handlerdata/addproducto';
    //         break;
    //     case topicCharger:
    //         optionsAWS.path = '/prueba/handlerdata/chargerawmaterial';
    //         break;
    //     case topicPerformance:
    //         optionsAWS.path = '/prueba/handlerdata/performance';
    //         break;
    //     case topicQuality:
    //         optionsAWS.path = '/prueba/handlerdata/qualityproduct';
    //         break;
    //     default:
    //         console.log(`\n%c${'El topic es incorrecto'}`)
    // }
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
    message = packet.payload.toString();
    topic = packet.topic.toString();

    console.clear();
    console.log(`MQTT:Desde el topic '${topic}', se envia el mensaje\n${message}`);

    // selectTopic(topic);

    if (topics[topic]) {
        optionsAWS.path = topics[topic];
    } else {

        // let obj;

        switch (topic) {
            case "temperatura-reactor":
                let data = message.split("-");
                message = {
                    "id": "34",
                    "temperatura": data[0],
                    "time_proceso": "hoy",
                    "Lote": data[1]
                }
                break;
        
            default:
                console.log(`\n%c${'El topic es incorrecto'}`)
                break;
            }
            
        console.log(message)
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
    })
}

function messageMQTT(){
    client.on('message', (topic, message) => {
        data = JSON.parse(message);
        data.topic = topic;
        
        req = reqAWS();          
        req.on('error', error => {
            console.error(error)
        })
        req.write(JSON.stringify(data))
        req.end()
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