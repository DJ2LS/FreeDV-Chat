
console.log('-----------------------------------------------------------------------------');
console.log('             SENDER.                                                         ');
console.log('-----------------------------------------------------------------------------');


const express = require('express'); // WEBSERVER
var bodyParser = require('body-parser')
const webserver = express();
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })
 // create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })
 
const status = require('./status'); // LADE DATEI MIT VARIABLEN
const tnc = require('./tnc'); // LADE diese DATEI als variable wegen der TNC COMMANDS und deren globalen Verfügbarkeit


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// DATABASE                                   
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
// ---- SettingsDB
const settingsadapter = new FileSync('db/settingsdb.json');
global.settingsDB = low(settingsadapter);
 settingsDB.defaults({usersettings:[], tncsettings:[]}).write();
// ---- MessageDB
const messageadapter = new FileSync('db/messagedb.json');
global.messageDB = low(messageadapter);
messageDB.defaults({messages:[]}).write();

console.log(new Date().toISOString() + ' : SRV : ' + 'Database initialized - SETTINGS');
console.log(new Date().toISOString() + ' : SRV : ' + 'Database initialized - MESSAGES');


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// WEBSERVER.                              
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

webserver.post('/', function (req, res) {
  res.send('Got a POST request');
});

//////////////////////////////////////////////////////////// WEBSERVER GET STATUS
webserver.get('/status', (req, res) => {
    res.json({
        'myCALL' : status.myCALL,
        'myGRID' : status.myGRID,
        'dxCALL' : status.dxCALL,
        'dxGRID' : status.dxGRID,
        'arqBANDWITH' : status.arqBANDWITH,
        'arqSTATUS' : status.arqSTATUS,
        'pttSTATUS' : status.pttSTATUS,
        'busySTATUS' : status.busySTATUS,
        'arqDB' : status.arqDB,
        'arqQUALITY' : status.arqQUALITY,
    });
})


//////////////////////////////////////////////////////////// WEBSERVER GET SETTINGS
webserver.get('/settings', (req, res) => {
    res.json({
        'myCALL' : status.myCALL,
        'myGRID' : status.myGRID,
        'ARDOPHost' : status.ARDOPHost,
        'ARDOPLOGLevel' : status.ARDOPLOGLevel,
        'ARDOPCMDPort' : status.ARDOPCMDPort,
        'ARDOPDATAPort' : status.ARDOPDATAPort,
        'WEBSERVERPort' : status.WEBSERVERPort,
        'ARQTIMEOUT' : status.ARQTIMEOUT,
        'TUNERANGE' : status.TUNERANGE
    });
})

//////////////////////////////////////////////////////////// WEBSERVER POST SETTINGS
webserver.post('/settings', urlencodedParser, async function (req, res) {
        status.myCALL = req.body.myCALL;
        status.myGRID = req.body.myGRID;
        status.ARDOPHost = req.body.ARDOPHost;
        status.ARDOPLOGLevel = req.body.ARDOPLOGLevel;
        status.ARDOPCMDPort = req.body.ARDOPCMDPort;
        status.ARDOPDATAPort = req.body.ARDOPDATAPort;
        status.WEBSERVERPort = req.body.WEBSERVERPort;
        status.ARQTIMEOUT = req.body.ARQTIMEOUT;
        status.TUNERANGE = req.body.TUNERANGE;
                   
        settingsDB.get('usersettings')
            .find('myCALL')       
           .assign({'myCALL': req.body.myCALL})                        
           .assign({'myGRID': req.body.myGRID})
            .write();                        
 
        settingsDB.get('tncsettings')
            .find('ARDOPHost')       
           .assign({'ARDOPHost': req.body.ARDOPHost})                        
           .assign({'WEBSERVERPort': req.body.WEBSERVERPort})
           .assign({'ARDOPCMDPort': req.body.ARDOPCMDPort})
           .assign({'ARDOPDATAPort': req.body.ARDOPDATAPort})
           .assign({'ARDOPLOGLevel': req.body.ARDOPLOGLevel})
           .assign({'ARQTIMEOUT': req.body.ARQTIMEOUT})
           .assign({'TUNERANGE': req.body.TUNERANGE})
            .write();         

        await tnc.INIT();
});

//////////////////////////////////////////////////////////// WEBSERVER GET MESSAGES
const url = require('url');

webserver.get('/messages', (req, res) => {
    const urlObject = url.parse(req.url,true).query;    //     console.log(urlObject['dxCALL']);
    var messages = messageDB.get('messages')
  		.filter({dxCALL : urlObject['dxCALL']})
//   		.filter({freq : parseInt(freq)})
  		.sortBy('id')
//   		.take(1)
  		.value()
	var data = []
    messages.forEach(function(object){
            data.push({
                id : object.id,
                mode : object.mode,
		        direction : object.direction,
		        type : object.type,
		        myCALL : object.myCALL,
		        myGRID : object.myGRID,
		        dxCALL : object.dxCALL,
		        dxGRID : object.dxGRID,
		        message : object.message,
		        status : object.status
            });
    });
    res.json(data);
});

//////////////////////////////////////////////////////////// WEBSERVER GET CHAT CALLSIGNS
webserver.get('/callsigns', (req, res) => {
    var messages = messageDB.get('messages')
  		.map('dxCALL')
        .uniq()
  		.value()
    res.json(messages);
});

//////////////////////////////////////////////////////////// WEBSERVER POST NEW COMMAND
webserver.post('/newcommand', urlencodedParser, function (req, res) {
    console.log(req.body.newcommand)

    if ( typeof req.body.newcommand !== 'undefined' && req.body.newcommand ){ // Prüfe ob  = undefined
                //console.log(req.body.newcommand)
// ------------------------------- TEST
        if(req.body.newcommand == 'TEST'){
          tnc.TEST();
          res.sendStatus(201);
          return;
        };
        
        
// ------------------------------- FECSEND
        
        if(req.body.newcommand == 'FECSEND'){
          tnc.FECSEND();
          res.sendStatus(201);
          return;
        };        
        
// ------------------------------- ARQCALL
        if(req.body.newcommand == 'ARQCALL'){
            tnc.CONNECT(req.body.callsign);
            tnc.CMD('VERSION');
            res.sendStatus(201); // NOTWENDIG WEGEN HTTP RESPONSE UND BEI NICHT SENDEN EINEM TIMEOUT von 2 Minuten. Ansonsten wird befehl erneut ausgeführt
        };
// ------------------------------- PING
        if(req.body.newcommand == 'PING'){
            tnc.PING(req.body.callsign);
            res.sendStatus(201);

        };
// ------------------------------- CQ
        if(req.body.newcommand == 'CQ'){
          tnc.CQ();
          res.sendStatus(201);
          return;
        };
// ------------------------------- ABORT
        if(req.body.newcommand == 'ABORT'){
            tnc.ABORT();
            res.sendStatus(201);
        };
// ------------------------------- DISCONNECT
        if(req.body.newcommand == 'DISCONNECT'){
            tnc.DISCONNECT();
            res.sendStatus(201);
        };
// ------------------------------- NEWMSG
        if(req.body.newcommand == 'NEWMSG'){
            res.sendStatus(201);
            
            if(req.body.type == 'BROADCAST'){
                var newmessage = status.myCALL + ' [' + status.myGRID + '] : ' +  tnc.replaceUmlaute(req.body.message);    
                var callsign = 'BROADCAST';    
            } else {                
                var newmessage = tnc.replaceUmlaute(req.body.message);
                var callsign = status.dxCALL;
            }      

            tnc.NEWMSG(newmessage);
             
            messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: req.body.mode,
                    direction: 'SEND',
                    type: req.body.type,
                    myCALL: status.myCALL,
                    myGRID : status.dxGRID,
                    dxCALL : callsign,
                    dxGRID : status.dxGRID,
                    message : newmessage,
                    status: 0})
                .write();          
        };
      }
});



// ARDOP TNC STARTEN
startWEBSERVER();



async function startWEBSERVER(){
//     await tnc.loadTNCSettings();
    await tnc.startARDOP();
    // STATISCHE DATEIEN MIT WEBSERVER BEREITSTELLEN
    webserver.use('/', express.static(__dirname + '/userinterface'));   // ---> STATISCHE DATEIEN IM VEREZICHNIS "ASSETS" UND WEBBROWSER http://localhost:3000/assets/........
    // WEBSERVER STARTEN
    webserver.listen(status.WEBSERVERPort[0], () => {
    console.log(new Date().toISOString() + ' : WEB : ' + 'Started on http://localhost:' + status.WEBSERVERPort);
    })
}
