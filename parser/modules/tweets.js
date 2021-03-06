var fs = require('fs');

exports.import = function (config) {
	console.log('Parse Tweets');

	var tweets = [];

	[
		'2013_01',
		'2013_02',
		'2013_03',
		'2013_04',
		'2013_05',
		'2013_06',
		'2013_07'
	].forEach(function (file) {
		file = config.inputPath+'tweets/data/js/tweets/'+file+'.js';
		file = fs.readFileSync(file, 'utf8');
		file = file.replace(/.*?=/, '');
		file = JSON.parse(file);
		file.forEach(function (tweet) {
			var time = (new Date(tweet.created_at)).getTime()/1000;
			tweets.push({
				type:'tweet',
				subject:tweet.text,
				url:'http://twitter.com/bglaettli/status/'+tweet.id_str,
				start:time,
				end:time,
				from:{
					address: '@bglaettli',
					contact: 'Balthasar Glättli',
					org: 'parl.ch'
				},
				to:[],
				inBound:false,
				outBound:true
			})
		})
	})

	return tweets;
}