const status = require('./status'); // LADE DATEI MIT VARIABLEN
const tnc = require('./tnc'); // LADE diese DATEI als variable wegen der TNC COMMANDS und deren globalen Verfügbarkeit
const net = require('net'); // TERMINAL SESSION

var cmdtnc = new net.Socket();
var datatnc = new net.Socket();



 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// START ARDOP.                             
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
exports.startARDOP = async function(){
    await loadTNCSettings();
    await cmdtnc.connect(status.ARDOPCMDPort[0],status.ARDOPHost[0]);
    await datatnc.connect(status.ARDOPDATAPort[0],status.ARDOPHost[0]);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////  TNC COMMANDS.                      
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// -----  TNC CMD EXECUTION -------------------
exports.CMD = function(command){
	cmdtnc.write(command + '\r');
};

// -----  TEST TEST TEST-------------------
exports.TEST = function(){
    cmdtnc.write('FECSEND TRUE' + '\r');
};



// -----  TNC INIT -------------------
exports.INIT = async function(){
	status.arqSTATUS = 'IDLE';
    await cmdtnc.write('ABORT' + '\r');
    await cmdtnc.write('INITIALIZE' + '\r');
    await cmdtnc.write('CMDTRACE FALSE' + '\r');
    await cmdtnc.write('DEBUGLOG FALSE' + '\r');
    await cmdtnc.write('PURGEBUFFER' + '\r');
    await cmdtnc.write('LOGLEVEL '+ Number(status.ARDOPLOGLevel) + '\r');
    await cmdtnc.write('ARQTIMEOUT '+ Number(status.ARQTIMEOUT) + '\r');
    await cmdtnc.write('TUNERANGE '+ Number(status.TUNERANGE) + '\r');

    await tnc.MYCALL(status.myCALL);
    await tnc.MYGRID(status.myGRID);
    
};
// -------------------  MYCALL -------------------
exports.MYCALL = function(callsign){
	cmdtnc.write('MYCALL ' + callsign + '\r');
	console.log(new Date().toISOString() + ' : CMD : ' + 'MYCALL');
};

// -----  FECSEND-------------------
exports.FECSEND = function(){
  	const delay = t => new Promise(resolve => setTimeout(resolve, t));
	delay(500).then(() =>     cmdtnc.write('FECSEND TRUE' + '\r'));
};

// -------------------  ARQCALL MIT STATION -------------------
exports.CONNECT = function(callsign){
  	const delay = t => new Promise(resolve => setTimeout(resolve, t));
	cmdtnc.write('ABORT \r');
	delay(500).then(() =>     cmdtnc.write('ARQCALL ' + callsign + ' 5 \r'));
	status.arqSTATUS = 'CONNECTING';
	console.log(new Date().toISOString() + ' : CMD : ' + 'ARQCALL');
};

// -------------------  PING -------------------
exports.PING = function(callsign){
	cmdtnc.write('PING ' + callsign + ' 1 \r');
	status.arqSTATUS = 'IDLE';
	status.dxCALL = callsign;
	console.log(new Date().toISOString() + ' : CMD : ' + 'PING');

};

// -------------------  CQ -------------------
exports.CQ = function(callsign){
	cmdtnc.write('CQ 3 \r');
	status.arqSTATUS = 'CQ';
	console.log(new Date().toISOString() + ' : CMD : ' + 'CQ');

};

// -------------------  DISCONNECT -------------------
exports.DISCONNECT = function(callsign){
	cmdtnc.write('DISCONNECT \r');
	status.arqSTATUS = 'DISCONNECTING';
	console.log(new Date().toISOString() + ' : CMD : ' + 'DISCONNECT');

};

// -------------------  ABORT -------------------
exports.ABORT = function(callsign){
	cmdtnc.write('ABORT \r');
	status.arqSTATUS = 'DISCONNECTED';
	console.log(new Date().toISOString() + ' : CMD : ' + 'ABORT');

};

// -------------------  MYGRID -------------------
exports.MYGRID = function(gridsquare){
	cmdtnc.write('GRIDSQUARE ' + gridsquare + '\r');
	console.log(new Date().toISOString() + ' : CMD : ' + 'GRIDSQUARE');

};

// -------------------  NEW MESSAGE -------------------
exports.NEWMSG = function(newmsg){
		var data = newmsg;
		var prefix = 0x00;
		var suffix = 0x0d;
		var dataSize = data.length + 1;
		var bufferSize = dataSize + 2;
		var buffer = new Buffer.alloc(bufferSize);
		buffer.writeUInt8(prefix, 0);
		buffer.writeUInt8(dataSize, 1);
//		buffer.writeUInt16BE(dataSize, 1);
		buffer.writeUInt8(suffix, bufferSize - 1);
		buffer.write(data, 2);
		datatnc.write(buffer);
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// COMMAND TNC ON CONNECT 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

cmdtnc.on('connect', function() {
    tnc.INIT();
});



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// COMMAND TNC DATA PARSER 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

cmdtnc.on('data', function(data) {
	console.log('TNC:' + data);
 
//////////////////////////////////////////////////////////////////////////////// Check if PTT is TRUE / FALSE
 	if(data.toString('ASCII').trim() === 'PTT TRUE'){
 			status.pttSTATUS = true;
 	}

 	if(data.toString('ASCII').trim() === 'PTT FALSE'){
 			status.pttSTATUS = false;
 	}
 
//////////////////////////////////////////////////////////////////////////////// Check if BUSY is TRUE / FALSE
 	if(data.toString('ASCII').trim() === 'BUSY TRUE'){
 			status.busySTATUS = true; 	    
 	}

 	if(data.toString('ASCII').trim() === 'BUSY FALSE'){
 			status.busySTATUS = false;
 	}

	//////////////////////////////////////////////////////////////////////////////// WAIT FOR CQ --> CQ DN2LS 5 [JN48ea] --> 18 Zeichen CQ DJ2LS [JN48ea]
 	if(data.toString('ASCII').trim().includes('CQ') && data.length >= 10){
 		var str = data.toString('ASCII').split(" ");
 	    console.log(new Date().toISOString() + ' : TNC : ' + 'CQ FROM ' + str[1] + ' ' + str[2]);

        messageDB.get('messages')
            .push({
                id: new Date().getTime(),
                mode: 'ARQ',
                direction: 'RECEIVED',
                type: 'CQ',                    
                myCALL: status.myCALL,
                myGRID : status.dxGRID,
                dxCALL : str[1],
                dxGRID : str[2],
                message: 'CQ from ' + str[1] + ' ' +str[2],
                status: 0})
                .write();
	}

//////////////////////////////////////////////////////////////////////////////// Check if connected to client

if(data.toString('ASCII').trim().includes('ARQ CONNECTION ENDED WITH')){

console.log("WHOOPWHOOO");
}





 	if(data.toString('ASCII').trim().includes('CONNECTED')){
 		if(data.toString('ASCII').trim().includes('DISCONNECTED')){
 			status.arqSTATUS = 'DISCONNECTED';
            
             messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'ARQ',
                    direction: 'INFO',
                    type: 'INFO',                    
                    myCALL: status.myCALL,
                    myGRID : status.dxGRID,
                    dxCALL : status.dxCALL,
                    dxGRID : status.dxGRID,
                    message: 'Disconnected from ' + status.dxCALL,
                    status: 0})
                .write(); 	  			
                
    	    console.log(new Date().toISOString() + ' : TNC : ' + 'DISCONNECTED');
 		} else if(data.length < 25){				// CONNECTED DN2LS 2500
 			var str = data.toString('ASCII').split(" ");
 			status.dxCALL = str[1]; // CALLSIGN
 			status.arqBANDWITH = str[2]; // BANDWITH
 			status.arqSTATUS = 'CONNECTED';
 	        
            messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'ARQ',
                    direction: 'INFO',
                    type: 'INFO',                    
                    myCALL: status.myCALL,
                    myGRID : status.dxGRID,
                    dxCALL : str[1],
                    dxGRID : status.dxGRID,
                    message: 'Connected to ' + str[1],
                    status: 0})
                .write(); 	        
 	   	    
            console.log(new Date().toISOString() + ' : TNC : ' + 'CONNECTED TO ' + str[1] + ' BW: ' + str[2]);
      
 		} else if(data.length < 35){				// CONNECTED DN2LS 2500 [JN48ea]
 			var str = data.toString('ASCII').split(" ");
 			status.dxCALL = str[1]; // CALLSIGN
 			status.arqBANDWITH = str[2]; // BANDWITH
 			status.arqSTATUS = 'CONNECTED';
 	        console.log(new Date().toISOString() + ' : TNC : ' + 'CONNECTED TO ' + str[1] + ' BW: ' + str[2]);

            messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'ARQ',
                    direction: 'INFO',
                    type: 'INFO',                    
                    myCALL: status.myCALL,
                    myGRID : status.dxGRID,
                    dxCALL : str[1],
                    dxGRID : status.dxGRID,
                    message: 'Connected to ' + str[1],
                    status: 0})
                .write(); 	    
 		}

 	}
 	


//////////////////////////////////////////////////////////////////////////////// Check if disconnecting
 	if(data.toString('ASCII').trim().includes('DISCONNECT NOW TRUE')){
 		var str = data.toString('ASCII').split(" ");
 		status.arqSTATUS = 'DISCONNECTING';
  	    console.log(new Date().toISOString() + ' : TNC : ' + 'DISCONNECTING FROM ' + status.dxCALL);
	}

 	if(data.toString('ASCII').trim().includes('STATUS INITIATING ARQ DISCONNECT')){
 		var str = data.toString('ASCII').split(" ");
 		status.arqSTATUS = 'DISCONNECTING';
  	    console.log(new Date().toISOString() + ' : TNC : ' + 'DISCONNECTING FROM ' + status.dxCALL);
	}
 

//////////////////////////////////////////////////////////////////////////////// Check if connecting to client ----> FEHLERHAFT
 	if(data.toString('ASCII').trim().includes('ARQCALL')){
 		var str = data.toString('ASCII').split(" ");
 		status.arqSTATUS = 'CONNECTING';
  	    console.log(new Date().toISOString() + ' : TNC : ' + 'CONNECTING TO ' + str[1]);
	}
 	
 
//////////////////////////////////////////////////////////////////////////////// Check if connecting failed --> STATUS CONNECT TO DN2LS FAILED! ----> FEHLERHAFT
// 	if(data.toString('ASCII').trim().includes('FAILED!')){
 	if(data.toString('ASCII').trim().includes('STATUS CONNECT TO')){
 		var str = data.toString('ASCII').split(" ");
 		status.arqSTATUS = 'FAILED';

 	    console.log(new Date().toISOString() + ' : TNC : ' + 'ARQ CONNECTION TO ' + status.dxCALL + ' FAILED');
            messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'ARQ',
                    direction: 'INFO',
                    type: 'INFO',                    
                    myCALL: status.myCALL,
                    myGRID : status.myGRID,
                    dxCALL : status.dxCALL,
                    dxGRID : status.dxGRID,
                    message: 'CONNECTION TO ' + str[3] + 'FAILED!',
                    status: 0})
                .write(); 	 
	}

 	if(data.toString('ASCII').trim().includes('ARQ CONNECTION TO')){
 		var str = data.toString('ASCII').split(" ");
 		status.arqSTATUS = 'FAILED';
        console.log(new Date().toISOString() + ' : TNC : ' + 'ARQ CONNECTION TO ' + status.dxCALL + ' FAILED');
            messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'ARQ',
                    direction: 'INFO',
                    type: 'INFO',                    
                    myCALL: status.myCALL,
                    myGRID : status.myGRID,
                    dxCALL : status.dxCALL,
                    dxGRID : status.dxGRID,
                    message: 'CONNECTION TO ' + str[3] + 'FAILED!',
                    status: 0})
                .write(); 	 
	}
 
//////////////////////////////////////////////////////////////////////////////// Check if disconnecting --> STATUS INITIATING ARQ DISCONNECT
 	if(data.toString('ASCII').trim().includes('INITIATING ARQ DISCONNECT')){
 		status.arqSTATUS = 'DISCONNECTING';
     	console.log(new Date().toISOString() + ' : TNC : ' + 'INITIATING ARQ DISCONNECT');
	}

//////////////////////////////////////////////////////////////////////////////// PING CHECKER  PING DJ2LS>DN2LS 30 100 ----> EMPFÄNGER

	if(data.toString('ASCII').trim().includes('PING') && data.toString('ASCII').trim().includes('>') && data.length >= 20){
//  	    console.log(data.length);
 		var str = data.toString('ASCII').split(" ");
//  	 	console.log(str[1]);
//  	 	console.log(str[2]); // SNR DB
//  	 	console.log(str[3]); // SIGNAL QUALITY
 		var callsigns = str[1].toString('ASCII').split(">");
//  	 	console.log(callsigns[0]); //PING SENDER
//  		console.log(callsigns[1]); // PING EMPFÄNGER
 			status.arqSTATUS = 'PING';
 			status.arqDB = str[2];
 			status.arqQUALITY = str[3];
 			status.dxCALL = callsigns[0];
//         console.log(new Date().toISOString() + ' : TNC : ' + 'PING FROM: ' + callsigns[0] + ' ; Noise: '+ str[2] + ' Quality: ' + str[3]);
        
            messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'ARQ',
                    direction: 'RECEIVED',
                    type: 'PING',                    
                    myCALL: status.myCALL,
                    myGRID : status.dxGRID,
                    dxCALL : callsigns[0],
                    dxGRID : status.dxGRID,
                    message: 'PING RECEIVED / Noise: '+ str[2] + ' dB / Quality: ' + str[3],
                    status: 0})
                .write();
        
        
	}

//////////////////////////////////////////////////////////////////////////////// PING CHECKER  WAIT FOR PINGACK 17 90 ----> SENDER


//  	 WAIT FOR PINGACK 17 90 --> SENDE
 	if(data.toString('ASCII').trim().includes('PINGACK') && 10 < data.length <= 14 ){
//  	    console.log(data.length);
 		var str = data.toString('ASCII').split(" ");
 			status.arqSTATUS = 'PING';
 			status.arqDB = str[1];
 			status.arqQUALITY = str[2];
 
//         console.log(str[0]);
//         console.log(str[1]); // SNR DB
//         console.log(str[2]); // SIGNAL QUALITY
        
 //        console.log(new Date().toISOString() + ' : TNC : ' + 'PING TO: ' + callsigns[0] + ' ; Noise: '+ str[1] + ' Quality: ' + str[2]);
        
     if(data.toString('ASCII').trim().includes('strTargetCall=')){   
        
         		var strTargetCall = data.toString('ASCII').split("=");
				status.dxCALL = strTargetCall[1];
// 				console.log(status.dxCALL);            
       }
           messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'ARQ',
                    direction: 'SEND',
                    type: 'PING',                    
                    myCALL: status.myCALL,
                    myGRID : status.dxGRID,
                    dxCALL : status.dxCALL,
                    dxGRID : status.dxGRID,
                    message: 'PING SENT / Noise: '+ str[1] + ' dB / Quality: ' + str[2],
                    status: 0})
                .write();
		
	}


 	
 });
 
 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// DATA TNC PARSER                      
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

datatnc.on('data', function(data) {
//  	console.log(new Date().toISOString() + ' : DATA : ' + data);
	console.log('DATA:' + data);
	


	//////////////////////////////////////////////////////////////////////////////// IDFID	
if(data.toString('ASCII').trim().includes('IDFID')){
//  	    console.log(data.length);
 		var str = data.toString('ASCII').split(":");
//  		console.log(str[1]); // CALLSIGN
//  		console.log(str[3].replace(/[^a-zA-Z0-9 ]/g, "")); // LOCATOR, remove [ and ] from Locator Console String
// 	    console.log(new Date().toISOString() + ' : TNC : ' + 'CQ FROM ' + str[1] + ' ' + str[3]);
	}


	//////////////////////////////////////////////////////////////////////////////// NEW ARQ MESSAGE RECEIVED
if(data.toString('ASCII').trim().includes('ARQ')){	
	var str = data.toString('ASCII').split("ARQ");
// 	    console.log(new Date().toISOString() + ' : MSG : ' + str[1]);
            messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'ARQ',
                    direction: 'RECEIVED',
                    type: 'MESSAGE',                    
                    myCALL: status.myCALL,
                    myGRID : status.dxGRID,
                    dxCALL : status.dxCALL,
                    dxGRID : status.dxGRID,
                    message: str[1],
                    status: 0})
                .write();
                
 }               

if(data.toString('ASCII').trim().includes('FEC')){	
	var str = data.toString('ASCII').split("FEC");
// 	    console.log(new Date().toISOString() + ' : MSG : ' + str[1]);
            messageDB.get('messages')
                .push({
                    id: new Date().getTime(),
                    mode: 'FEC',
                    direction: 'RECEIVED',
                    type: 'BROADCAST',                    
                    myCALL: status.myCALL,
                    myGRID : status.dxGRID,
                    dxCALL : 'BROADCAST',
                    dxGRID : status.dxGRID,
                    message: str[1],
                    status: 0})
                .write();
                
 }  
 	
});



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// LOAD TNC SETTINGS                 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function loadTNCSettings() {
// exports.loadTNCSettings = function(){
    status.ARDOPHost = settingsDB.get('tncsettings').map('ARDOPHost').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - Host: ' + status.ARDOPHost);
    status.ARDOPCMDPort = settingsDB.get('tncsettings').map('ARDOPCMDPort').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - CMD-Port: ' + status.ARDOPCMDPort);
    status.ARDOPDATAPort = settingsDB.get('tncsettings').map('ARDOPDATAPort').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - DATA-Port: ' + status.ARDOPDATAPort);
    status.ARDOPLOGLevel = settingsDB.get('tncsettings').map('ARDOPLOGLevel').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - Log Level: ' + status.ARDOPLOGLevel);
    status.ARQTIMEOUT = settingsDB.get('tncsettings').map('ARQTIMEOUT').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - ARQTIMEOUT: ' + status.ARQTIMEOUT);
        status.TUNERANGE = settingsDB.get('tncsettings').map('TUNERANGE').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - TUNERANGE: ' + status.TUNERANGE);
            
    status.WEBSERVERPort = settingsDB.get('tncsettings').map('WEBSERVERPort').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - Webserver Port: ' + status.WEBSERVERPort);
            
    status.myCALL = settingsDB.get('usersettings').map('myCALL').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - Call: ' + status.myCALL);
    status.myGRID = settingsDB.get('usersettings').map('myGRID').value();
    console.log(new Date().toISOString() + ' : SRV : ' + 'Settings Loaded - Grid: ' + status.myGRID);
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////// UMLAUT FUNKTION                 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// https://stackoverflow.com/questions/11652681/replacing-umlauts-in-js/11653019
const umlautMap = {
  '\u00dc': 'UE',
  '\u00c4': 'AE',
  '\u00d6': 'OE',
  '\u00fc': 'ue',
  '\u00e4': 'ae',
  '\u00f6': 'oe',
  '\u00df': 'ss',
}

exports.replaceUmlaute =  function(str){
  return str
    .replace(/[\u00dc|\u00c4|\u00d6][a-z]/g, (a) => {
      const big = umlautMap[a.slice(0, 1)];
      return big.charAt(0) + big.charAt(1).toLowerCase() + a.slice(1);
    })
    .replace(new RegExp('['+Object.keys(umlautMap).join('|')+']',"g"),
      (a) => umlautMap[a]
    );
}
