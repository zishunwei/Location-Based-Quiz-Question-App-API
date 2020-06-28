//Create a file called geoJSON.js and set up the database connection
var express = require('express');
var pg = require('pg');
var geoJSON = require('express').Router();
var fs = require('fs');

var configtext = "" + fs.readFileSync("/home/studentuser/certs/postGISConnection.js");

// now convert the configruation file into the correct format -i.e. a name/value pair array
var configarray = configtext.split(",");
var config = {};
for (var i = 0; i < configarray.length; i++) {
    var split = configarray[i].split(':');
    config[split[0].trim()] = split[1].trim();
}
var pool = new pg.Pool(config);
console.log(config);

//Add a simple test into the code to show that the route is working
geoJSON.route('/testGeoJSON').get(function (req, res) {
    res.json({message: req.originalUrl});
});


//This is to get all questions by all users
geoJSON.get('/getAllQuestions', function (req, res) {

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        var colnames = "id, question_title, question_text, answer_1,";
        colnames = colnames + "answer_2, answer_3, answer_4, port_id, correct_answer";
        console.log("colnames are " + colnames);
        // now use the inbuilt geoJSON functionality
        // and create the required geoJSON format using a query adapted from here:
        // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
        // note that query needs to be a single string with no line breaks so built it up bit by bit
        var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
        querystring += "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, ";
        querystring += "row_to_json((SELECT l FROM (SELECT " + colnames + " ) As l      )) As properties";
        querystring += "   FROM public.quizquestions As lg ";
        querystring += " ) As f ";
        console.log(querystring);
// run the final query
        client.query(querystring, function (err, result) {
//call `done()` to release the client back to the pool
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

//This is to get questions from DB by port id
geoJSON.get('/getQuestions/:port_id', function (req, res) {

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        //Code to get only the geoJSON for a specific port id
        var colnames = "id, question_title, question_text, answer_1,";
        colnames = colnames + "answer_2, answer_3, answer_4, port_id, correct_answer";
        console.log("colnames are " + colnames);
        // now use the inbuilt geoJSON functionality
        // and create the required geoJSON format using a query adapted from here:
        // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
        var port_id = req.params.port_id;
        // note that query needs to be a single string with no line breaks so built it up bit by bit
        var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
        querystring += "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, ";
        querystring += "row_to_json((SELECT l FROM (SELECT " + colnames + " ) As l      )) As properties";
        querystring += "   FROM public.quizquestions As lg ";
        querystring += " where port_id = $1 limit 100  ) As f ";
        console.log(querystring);

// run the final query
        client.query(querystring, [port_id], function (err, result) {
//call `done()` to release the client back to the pool
            done();
            if (err) {
                console.log(err);
                    res.status(400).send(err);
                }
                res.status(200).send(result.rows);
            });
        });
    });

// This is to get the number of questions users have answered correctly
geoJSON.get('/getNumberCorrect/:port_id', function (req, res) {

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        var port_id = req.params.port_id;
        //Quiz App: user is told how many questions they have answered correctly when they answer a question
        // $1 is the port_id parameter passed to the query
        var querystring = "select array_to_json (array_agg(c)) from " +
            "(SELECT COUNT(*) AS num_questions from public.quizanswers where (answer_selected = correct_answer) " +
            "and port_id = $1) c;";
        console.log(querystring);
// run the query
        client.query(querystring, [port_id], function (err, result) {
//call `done()` to release the client back to the pool
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

// This is to get ranking
geoJSON.get('/getRanking/:port_id', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        var port_id = req.params.port_id;

        // Quiz App: user is given their ranking (in comparison to all other users) (as a menu option)
        // $1 is the port_id parameter passed to the query
        var querystring = "select array_to_json (array_agg(hh)) from (select c.rank from (SELECT b.port_id, " +
            "rank()over (order by num_questions desc) as rank from (select COUNT(*) AS num_questions, " +
            "port_id from public.quizanswers where answer_selected = correct_answer group by port_id) b) c " +
            "where c.port_id = $1) hh";
        console.log(querystring);
// run the query
        client.query(querystring, [port_id], function (err, result) {
//call `done()` to release the client back to the pool
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

// This is for the  graph showing top 5 scorers in the quiz
geoJSON.get('/getTopFive', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // Quiz App: graph showing top 5 scorers in the quiz (as a menu option)
        // no need for parameters in this case
        // data is returned as JSON so that it can be used in a D3 graph
        var querystring = "select array_to_json (array_agg(c)) from " +
            "(select rank() over (order by num_questions desc) as rank , port_id " +
            "from (select COUNT(*) AS num_questions, port_id " +
            "from public.quizanswers where answer_selected = correct_answer " +
            "group by port_id) b limit 5) c";
        console.log(querystring);
// run the query
        client.query(querystring, function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

// This is for the D3 graph showing daily participation rates (for all users)
geoJSON.get('/getParticipationRates', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // Questions App: graph showing daily participation rates for the past week (how many questions have been answered, and how many answers were correct) (as a menu option)
        // return data as JSON so that it can be used in D3
        // For all users

        var querystring = "select  array_to_json (array_agg(c)) from " +
            "(select day, sum(questions_answered) as questions_answered, sum(questions_correct) as questions_correct " +
            "from public.participation_rates group by day) c";
        console.log(querystring);
        // run the query
        client.query(querystring, function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

// This is for the D3 graph showing daily participation rates (for only one user by port_id)
geoJSON.get('/getParticipationRates/:port_id', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // Questions App: graph showing daily participation rates for the past week (how many questions have been answered, and how many answers were correct) (as a menu option)
        // return data as JSON so that it can be used in D3
        // For your user only - $1 is the port_id
        var querystring = "select array_to_json (array_agg(c)) from " +
            "(select * from public.participation_rates where port_id = $1) c";
        console.log(querystring);
        var port_id = req.params.port_id;
        // run the query
        client.query(querystring, [port_id], function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

// This is for getting the questions added by all users last week
geoJSON.get('/getLastWeek', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // Questions App: map layer showing all the questions added in the last week (by any user).
        // The layer must be added and removed via a menu option
        // Return result as GeoJSON for display purposes
        var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM " +
            "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, " +
            "row_to_json((SELECT l FROM (SELECT id, question_title, question_text, answer_1, answer_2, answer_3, " +
            "answer_4, port_id, correct_answer) As l )) As properties " +
            " FROM public.quizquestions  As lg " +
            " where timestamp > NOW()::DATE-EXTRACT(DOW FROM NOW())::INTEGER-7  limit 100  ) As f";
        console.log(querystring);
        // run the query
        client.query(querystring, function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

// This is for getting the closest five questions added by all the users
geoJSON.get('/getClosestFive', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // to get the user's location
        var userLng = req.query.longitude;
        var userLat = req.query.latitude;
        // Quiz App?? (the assignment sheet said it is a questions component):
        // map layer showing the 5 questions closest to the user’s current location, added by any user.  The layer must be added/removed via a menu option
        // Return result as GeoJSON for display purposes
        // XXX and YYY are the lat/lng of the user
        // note that as this is a geomfromtext situation you can't use the standard $1, $2 for these variables - instead build the query up using strings

        var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM " +
            "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, " +
            "row_to_json((SELECT l FROM (SELECT id, question_title, question_text, answer_1, answer_2, answer_3, answer_4, port_id, correct_answer) As l " +
            " )) As properties" + " FROM   (select c.* from public.quizquestions c " +
            "inner join (select id, st_distance(a.location, st_geomfromtext('POINT(" + userLng + " " + userLat + ")',4326)) as distance " +
            "from public.quizquestions a " + "order by distance asc " + "limit 5) b " +
            "on c.id = b.id ) as lg) As f";

        console.log(querystring);
        // run the query
        client.query(querystring, function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});


// This is for getting the most 5 difficult questions
geoJSON.get('/getDifficult', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // Questions App: list of the 5 most difficult questions (via a menu option) – i.e. where most wrong answers were given
        // Return result as a JSON list
        var querystring = "select array_to_json (array_agg(d)) from (select c.* from public.quizquestions c " +
            "inner join (select count(*) as incorrectanswers, question_id from public.quizanswers where " +
            "answer_selected <> correct_answer group by question_id order by incorrectanswers desc " +
            "limit 5) b on b.question_id = c.id) d;";
        console.log(querystring);
        // run the query
        client.query(querystring, function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

// This is for getting the last 5 questions the user answered
geoJSON.get('/getLastFive/:port_id', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // Quiz App: map showing the last 5 questions that the user answered (colour coded depending on whether they were right/wrong the first time they answered the question)
        // Return result as GeoJSON
        // $1 is the port id

        var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM " +
            "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, " +
            "row_to_json((SELECT l FROM (SELECT id, question_title, question_text, answer_1, answer_2, answer_3, " +
            "answer_4, port_id, correct_answer, answer_correct) As l )) As properties " +
            " FROM (select a.*, b.answer_correct from public.quizquestions a " +
            "inner join (select question_id, answer_selected=correct_answer as answer_correct " +
            "from public.quizanswers where port_id = $1 order by timestamp desc " +
            "limit 5) b on a.id = b.question_id) as lg) As f";
        console.log(querystring);
        var port_id = req.params.port_id;
        // run the query
        client.query(querystring, [port_id], function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});

// This is for getting the questions users answer incorrectly
geoJSON.get('/getIncorrect/:port_id', function (req, res) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("not able to get connection " + err);
            res.status(400).send(err);
        }
        // Quiz App: App only shows questions and calculates proximity alerts for questions that the user hasn’t answered correctly
        // so generate a list of incorrectly answered or unanswered questions for this user
        // return as GeoJSON
        // $1 and $2 are the port_id for the user
        var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM " +
            "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, " +
            "row_to_json((SELECT l FROM (SELECT id, question_title, question_text, answer_1, answer_2, answer_3, answer_4, port_id, correct_answer) As l " +
            " )) As properties " + " FROM " + "(select * from public.quizquestions " +
            "where id in ( " + "select question_id from public.quizanswers " +
            "where port_id = $1 and answer_selected <> correct_answer " + "union all " +
            "select id from public.quizquestions " + "where id not in (select question_id from public.quizanswers) " +
            "and port_id = $2) " + ") as lg) As f";
        console.log(querystring);
        var port_id = req.params.port_id;
        // run the query
        client.query(querystring, [port_id, port_id], function (err, result) {
            done();
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.status(200).send(result.rows);
        });
    });
});


//Make the last line of the code the export function so that the route can be published to the dataAPI.js server
module.exports = geoJSON;