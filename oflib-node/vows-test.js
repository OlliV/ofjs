require('./lib/oflib.js')


vows.describe(oflib).addBatch({
	'OF_MESSAGE' : {  
		'with header': {
		  topic: [version, type, length, xid],
		 		'has length of 8': function(topic){
			assert.equal topic.length, 3
		}
		}
		topic:
	}
});
