var fs = require('fs');

exports.import = function (vds, config) {
	console.log('Merge with Contacts');

	importKnownAddresses('data/contacts/known_persons.tsv');

	var events = [];

	events = events.concat(importJSON(
		config.inputPath + 'imap/sms.json',
		function (event) { event.type = 'sms' }
	));

	events = events.concat(importJSON(
		config.inputPath + 'imap/calllogs.json',
		function (event) { event.type = 'call' }
	));

	events = events.concat(importJSON(
		config.inputPath + 'imap/vds.json',
		function (event) { event.type = 'mail' }
	));

	var edges = [];

	events = events.map(function (event) {
		var newEvent = {};

		if (event.date instanceof Array) event.date = event.date[0];

		newEvent.subject = event.subject ? event.subject.join(', ') : '';
		newEvent.from    = decodeAddresses(event.from)[0];
		newEvent.to      = decodeAddresses(event.to);
		newEvent.start   = Math.round((new Date(event.date)).getTime()/1000);
		newEvent.end     = Math.round((new Date(event.date)).getTime()/1000);
		newEvent.type    = event.type;

		newEvent.inBound  = /Balthasar Glättli/.test(JSON.stringify(newEvent.to));
		newEvent.outBound = /Balthasar Glättli/.test(JSON.stringify(newEvent.from));

		return newEvent;
	});

	var startDate = config.timeStart;
	var endDate   = config.timeStart + config.days*86400;

	var usedTimes = [];
	events.forEach(function (event) {
		if (event.type != 'mail') usedTimes[event.start] = true;
	})

	events = events.filter(function (event) {
		if ((event.type == 'mail') && usedTimes[event.start]) return false;
		if (event.end < startDate) return false;
		if (event.start > endDate) return false;
		return true;
	})

	// Matche mit VDS-Daten
	var calls = vds.filter(function (entry) {
		if (entry.type != 'call') return false;
		return true;
	});

	events.forEach(function (event) {
		if (event.type != 'call') return false;
		if (event.inBound == event.outBound) return false;
		var incoming = event.inBound;
		var bestDelta = 20;
		var bestCall = false;
		calls.forEach(function (call) {
			if (call.data.incoming != incoming) return false;
			var delta = Math.abs(call.timeStart - event.start);
			if (delta < bestDelta) {
				bestDelta = delta;
				bestCall = call;
			}
		})
		if (bestCall) {
			event.start = bestCall.timeStart;
			event.end = bestCall.timeEnd;
			bestCall.timeStart = -1;
		}
	})

	exportUnknownAddresses('data/contacts/unknown_persons.tsv');

	return events;
}

function importJSON(file, cleanupFunction) {
	var data = JSON.parse(fs.readFileSync(file, 'utf8'));
	data.forEach(function (entry) {
		cleanupFunction(entry);
	})
	return data;
}


var unknownAddresses = {};
var knownAddresses = {};

function decodeAddresses(addresses) {
	if (addresses === undefined) return [];

	var cleanAddresses = [];
	addresses.forEach(function (address) {
		address = address.replace(/[\,\n\r]/g, '\t')
		address.split('\t').forEach(function (address) {
			address = address.replace(/^\s+|\s+$/g, ''); // trim
			if (address != '') cleanAddresses.push(address);
		})
	})

	addresses = {};

	cleanAddresses.forEach(function (address) {
		address = address.toLowerCase().replace(/[^a-z0-9@\.\-]/g, '');
		
		knownAddress = knownAddresses[address];
		if (knownAddress) {
			addresses[knownAddress.contact] = knownAddress;
			return
		}

		if (unknownAddresses[address] === undefined) {
			unknownAddresses[address] = {address:address, count:0}
		}
		unknownAddresses[address].count++;

		return;
	});

	addresses = Object.keys(addresses).map(function (key) { return addresses[key] });

	return addresses;
}

function exportUnknownAddresses(file) {
	var csv = Object.keys(unknownAddresses).map(function (key) {
		return [unknownAddresses[key].count, unknownAddresses[key].address];
	})
	csv.sort(function (a,b) {
		return b[0]-a[0];
	})
	csv = csv.map(function (entry) {
		return entry.join('\t');
	})
	fs.writeFileSync(file, csv.join('\n'), 'utf8');
}

function importKnownAddresses(file) {
	knownAddresses = {};

	var rows = fs.readFileSync(file, 'utf8').split('\n');
	var header = rows.shift().split('\t');

	rows.forEach(function (row) {
		row = row.split('\t');
		var obj = {};
		header.forEach(function (colName, index) {
			obj[colName] = row[index];
		})
		obj.cleaned = (obj.cleaned == '1');
		delete obj.count;
		knownAddresses[obj.address] = obj;
	})
}


