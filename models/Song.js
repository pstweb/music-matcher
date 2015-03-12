/**
 * Created by Thomas TRIBOULT on 16/02/2015.
 */
var mongoose = require("mongoose"),
    async = require("async"),
    Utils = require("./Utils"),
    BMH = require("./BoyerMooreHorspool"),
    schema = new mongoose.Schema({
        title: String,
        artist: String,
        parts: [{
            element: String,
            root: String,
            progression: [String]
        }]
    });

// Set the full text search index on song title and artist name
schema.index({title: 'text', artist: 'text'});

schema.statics.getSong = function(id, callback) {
    var song = {};
    Song.findOne({_id: id})
        .exec(function(err, doc){
            if (!err) {
                song = doc;
            }

            callback(song);
        });
};

schema.statics.random = function(nb, callback) {
    var indexes = [],
        find = function(){
            var songs = [],
                calls = [];

            indexes.forEach(function(i){
                calls.push(function(callback){
                    Song.findOne()
                        .skip(indexes[i])
                        .exec(function(err, song){
                            if (err)
                                return callback(err);

                            songs.push(song);
                            callback(null, song);
                        });
                });
            });

            async.parallel(calls, function(err, song){
                if (!err) {
                    callback(songs);
                }
            });
        };

    this.count(function(err, count) {
        if (err) {
            return;
        }

        while (indexes.length < nb) {
            var rand = Math.floor(Math.random() * count);

            if (indexes.indexOf(rand) == -1) {
                indexes.push(rand);
            }
        }

        find();
    });
};

schema.statics.search = function(q, limit, callback){
    Song.find({ $text: { $search: q}})
        .limit(limit)
        .exec(function(err, songs){
            if (!err) {
                callback(songs);
            }
        });
};

schema.methods.findSimilar = function(callback){
    var currentSong = this;
    Song.find({ _id: { $ne: this._id}})
        .exec(function(err, songs){
            if (!err) {
                var simSongs = songs.filter(function(song){
                    for (var i=0; i<this.parts.length; i++) {
                        var chunks = Utils.subLists(this.parts[i].progression, 4);
                        for (var j in chunks) {
                            for (var k=0; k<song.parts.length; k++) {
                                if (BMH.run(chunks[j], song.parts[k].progression) != -1) {
                                    song.similarity = {
                                        part: k,
                                        prog: chunks[j]
                                    };
                                    return true;
                                }
                            }
                        }
                    }

                    return false;
                }, currentSong);

                callback(simSongs);
            }
        });
};

module.exports = Song = mongoose.model('Song', schema);