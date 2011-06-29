var mongodb = process.env['TEST_NATIVE'] != null ? require('../../lib/mongodb').native() : require('../../lib/mongodb').pure();

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../../deps/nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  Server = mongodb.Server,
  ServerManager = require('../../test/tools/server_manager').ServerManager;

var MONGODB = 'integration_tests';
var client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: true, poolSize: 1}), {native_parser: (process.env['TEST_NATIVE'] != null)});

// Define the tests, we want them to run as a nested test so we only clean up the 
// db connection once
var tests = testCase({
  setUp: function(callback) {
    // client.open(function(err, db_p) {
    //   if(numberOfTestsRun == Object.keys(tests).length) {
    //     // If first test drop the db
    //     client.dropDatabase(function(err, done) {
    //       callback();
    //     });                
    //   } else {
    //     return callback();        
    //   }      
    // });
    callback();
  },
  
  tearDown: function(callback) {
    // numberOfTestsRun = numberOfTestsRun - 1;
    // // Drop the database and close it
    // if(numberOfTestsRun <= 0) {
    //   // client.dropDatabase(function(err, done) {
    //     client.close();
    //     callback();
    //   // });        
    // } else {
    //   client.close();
    //   callback();        
    // }      
    callback();
  },

  shouldCorrectlyAuthenticateAgainstAdminDb : function(test) {
    // Boot up a simple server, then 
    var serverManager = new ServerManager({auth:false, purgedirectories:true})
    serverManager.start(true, function(err, result) {
      // Set up a connection and add a user to the db
      var db = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
      db.open(function(err, db) {
        db.admin().addUser('admin', 'admin', function(err, result){
          db.close();
          // Restart the server in auth mode (not purging the directories)
          serverManager = new ServerManager({auth:true, purgedirectories:false})
          serverManager.start(true, function(err, result) {            
            // Connect to the db
            db.open(function(err, db) {
              db.admin().authenticate('admin', 'admin', function(err, result) {
                test.ok(result);
                test.done();
              })              
            })            
          });
        });
      });
    });
    
    
    // var fs_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    // fs_client.bson_deserializer = client.bson_deserializer;
    // fs_client.bson_serializer = client.bson_serializer;
    // fs_client.pkFactory = client.pkFactory;
    //   
    // fs_client.open(function(err, fs_client) {
    //   fs_client.admin().authenticate('bob', 'secret', function(err, replies) {
    //     debug("==========================================================")
    //     debug(inspect(err))
    //     debug(inspect(replies))
    //     
    //     test.done();
    //   });
    // });
  }
})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;

// test_kill_cursors : function() {
//   var test_kill_cursors_client = new Db('integration_tests4_', new Server("127.0.0.1", 27017, {auto_reconnect: true}), {});
//   test_kill_cursors_client.bson_deserializer = client.bson_deserializer;
//   test_kill_cursors_client.bson_serializer = client.bson_serializer;
//   test_kill_cursors_client.pkFactory = client.pkFactory;
//
//   test_kill_cursors_client.open(function(err, test_kill_cursors_client) {
//     var number_of_tests_done = 0;
//
//     test_kill_cursors_client.dropCollection('test_kill_cursors', function(err, collection) {
//       test_kill_cursors_client.createCollection('test_kill_cursors', function(err, collection) {
//         test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
//           var clientCursors = cursorInfo.clientCursors_size;
//           var byLocation = cursorInfo.byLocation_size;
//
//           for(var i = 0; i < 1000; i++) {
//             collection.save({'i': i}, function(err, doc) {});
//           }
//
//           test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
//             test.equal(clientCursors, cursorInfo.clientCursors_size);
//             test.equal(byLocation, cursorInfo.byLocation_size);
//
//             for(var i = 0; i < 10; i++) {
//               collection.findOne(function(err, item) {});
//             }
//
//             test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
//               test.equal(clientCursors, cursorInfo.clientCursors_size);
//               test.equal(byLocation, cursorInfo.byLocation_size);
//
//               for(var i = 0; i < 10; i++) {
//                 collection.find(function(err, cursor) {
//                   cursor.nextObject(function(err, item) {
//                     cursor.close(function(err, cursor) {});
//
//                     if(i == 10) {
//                       test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
//                         test.equal(clientCursors, cursorInfo.clientCursors_size);
//                         test.equal(byLocation, cursorInfo.byLocation_size);
//
//                         collection.find(function(err, cursor) {
//                           cursor.nextObject(function(err, item) {
//                             test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
//                               test.equal(clientCursors, cursorInfo.clientCursors_size);
//                               test.equal(byLocation, cursorInfo.byLocation_size);
//
//                               cursor.close(function(err, cursor) {
//                                 test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
//                                   test.equal(clientCursors, cursorInfo.clientCursors_size);
//                                   test.equal(byLocation, cursorInfo.byLocation_size);
//
//                                   collection.find({}, {'limit':10}, function(err, cursor) {
//                                     cursor.nextObject(function(err, item) {
//                                       test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
//                                         test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
//                                           sys.puts("===================================== err: " + err)
//                                           sys.puts("===================================== cursorInfo: " + sys.inspect(cursorInfo))
//
//
//                                           test.equal(clientCursors, cursorInfo.clientCursors_size);
//                                           test.equal(byLocation, cursorInfo.byLocation_size);
//                                           number_of_tests_done = 1;
//                                         });
//                                       });
//                                     });
//                                   });
//                                 });
//                               });
//                             });
//                           });
//                         });
//                       });
//                     }
//                   });
//                 });
//               }
//             });
//           });
//         });
//       });
//     });
//
//     var intervalId = setInterval(function() {
//       if(number_of_tests_done == 1) {
//         clearInterval(intervalId);
//         finished_test({test_kill_cursors:'ok'});
//         test_kill_cursors_client.close();
//       }
//     }, 100);
//   });
// },
                                      
// test_force_binary_error : function() {
//   client.createCollection('test_force_binary_error', function(err, collection) {
//     // Try to fetch an object using a totally invalid and wrong hex string... what we're interested in here
//     // is the error handling of the findOne Method
//     var result= "";
//     var hexString = "5e9bd59248305adf18ebc15703a1";
//     for(var index=0 ; index < hexString.length; index+=2) {
//         var string= hexString.substr(index, 2);
//         var number= parseInt(string, 16);
//         result+= BinaryParser.fromByte(number);
//     }
//
//     // Generate a illegal ID
//     var id = client.bson_serializer.ObjectID.createFromHexString('5e9bd59248305adf18ebc157');
//     id.id = result;
//
//     // Execute with error
//     collection.findOne({"_id": id}, function(err, result) {
//       // test.equal(undefined, result)
//       test.ok(err != null)
//       finished_test({test_force_binary_error:'ok'});
//     });
//   });
// },
                      
// test_long_term_insert : function() {
//   var numberOfTimes = 21000;
//   
//   client.createCollection('test_safe_insert', function(err, collection) {
//     var timer = setInterval(function() {        
//       collection.insert({'test': 1}, {safe:true}, function(err, result) {
//         numberOfTimes = numberOfTimes - 1;
// 
//         if(numberOfTimes <= 0) {
//           clearInterval(timer);
//           collection.count(function(err, count) {
//             test.equal(21000, count);
//             finished_test({test_long_term_insert:'ok'})
//           });
//         }          
//       });
//     }, 1);      
//   });
// },  
