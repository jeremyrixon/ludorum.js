/** Package wrapper and layout.
*/
"use strict";
(function (global, init) { // Universal Module Definition.
	if (typeof define === 'function' && define.amd) {
		define(['creatartis-base'], init); // AMD module.
	} else if (typeof module === 'object' && module.exports) {
		module.exports = init(require('creatartis-base')); // CommonJS module.
	} else { // Browser or web worker (probably).
		global.ludorum = init(global.base); // Assumes base is loaded.
	}
})(this, function __init__(base) {
// Import synonyms. ////////////////////////////////////////////////////////////
	var declare = base.declare,
		unimplemented = base.objects.unimplemented,
		obj = base.obj,
		copy = base.copy,
		raiseIf = base.raiseIf,
		Iterable = base.Iterable,
		iterable = base.iterable,
		Future = base.Future,
		Randomness = base.Randomness,
		initialize = base.initialize,
		Statistics = base.Statistics,
		Events = base.Events;

// Library layout. /////////////////////////////////////////////////////////////
	var exports = {
		__name__: 'ludorum',
		__init__: __init__
	};
	__init__.dependencies = {'creatartis-base': base};

	/** The namespace `ludorum.utils` contains miscellaneous classes, functions 
	and definitions.
	*/
	var utils = exports.utils = {};


/** ## Class Game

The class `ludorum.Game` is the base type for all games.
*/
var Game = exports.Game = declare({
	/** Its constructor takes the active player/s. A player is active if and 
	only if it can move. The argument may be either a player's name (string) or 
	an array of players' names. It is used to initialize `Game.activePlayers`, 
	an array with the active players' names.
	*/
	constructor: function Game(activePlayers) {
		this.activePlayers = !activePlayers ? [this.players[0]] : 
			(!Array.isArray(activePlayers) ? [activePlayers] : activePlayers);
	},

	/** The game's `name` is used mainly for displaying purposes.
	*/
	name: '?',
	
	/** The game `players` are specified in an array of role names (strings), 
	that the players can assume in a match of this game. For example: `"Xs"` 
	and `"Os"` in TicTacToe, or `"Whites"` and `"Blacks"` in Chess.
	*/
	players: [],

	/** The moves of each active player are calculated by `moves()`. This method
	returns an object with every active player related to the moves each can 
	make in this turn. For example: 
	
	+ `{ Player1: ['Rock', 'Paper', 'Scissors'], Player2: ['Rock', 'Paper', 'Scissors'] }`
		
	If the game has finished then a _falsy_ value must be returned (`null` is 
	recommended).
	*/
	moves: unimplemented("Game", "moves"),

	/** Once the players have chosen their moves, the method `next(moves)` is 
	used to perform the given moves. It returns a new game instance with the
	resulting state. The moves object should have a move for each active player.
	For example:

	+ `{ Player1: 'Rock', Player2: 'Paper' }`
	
	There isn't a default implementation, so it must be overriden. It is 
	strongly advised to check if the moves argument has valid moves.
	*/
	next: unimplemented("Game", "next"),

	/** If the game is finished the result of the game is calculated with 
	`result()`. It returns an object with every player in the game related to a
	number. This number must be positive if the player wins, negative if the 
	player loses or zero if the game is a tie. For example:
	
	+ `{ Player1: -1, Player2: +1 }`
	
	If the game is not finished, this function must return a _falsy_ value 
	(`null` is recommended).
	*/
	result: unimplemented("Game", "result"),

	/** Some games may assign scores to the players in a finished game. This may
	differ from the result, since the score sign doesn't have to indicate 
	victory or defeat. For example:
	
	+ result: `{ Player1: -1, Player2: +1 }`
	+ scores: `{ Player1: 4, Player2: 15 }`
	
	The method `scores()` returns the scores if such is the case. By default, it
	return the same that `result()` does.
	*/
	scores: function scores() {
		return this.results();
	},
	
	/** In incomplete or imperfect information games all players have different
	access to the game state data. The method `view(player)` returns a modified 
	version of this game, that shows only the information from the perspective 
	of the given player. The other information is modelled as aleatory 
	variables.
	
	In this way searches in the game tree can be performed without revealing to
	the automatic player information it shouldn't have access to (a.k.a 
	_cheating_).
	*/
	view: function view(player) {
		return this;
	},
	
	// ### Player information ##################################################

	/** Method `isActive(player...)` checks if the given players are all active.
	*/
	isActive: function isActive() {
		for (var i = 0; i < arguments.length; i++) {
			if (this.activePlayers.indexOf(arguments[i]) < 0) {
				return false;
			}
		}
		return true;
	},

	/** In most games there is only one active player per turn. The method
	`activePlayer()` returns that active player's role if there is one and only
	one, else it raises an error.
	*/
	activePlayer: function activePlayer() {
		var len = this.activePlayers.length;
		raiseIf(len < 1, 'There is no active player.');
		raiseIf(len > 1, 'More than one player is active.');
		return this.activePlayers[0];
	},

	/** All players in a game are assumed to be opponents. The method 
	`opponents(players=activePlayers)` returns an array with the opponent roles
	of the given players, or of the active players by default. If not all
	players are opponents this method can be overriden.
	*/
	opponents: function opponents(players) {
		players = players || this.activePlayers;
		return this.players.filter(function (p) {
			return players.indexOf(p) < 0;
		});
	},

	/** Since most games have only two players, the method 
	`opponent(player=activePlayer)` conveniently returns the opponent of the 
	given player, or the active player by default.
	*/
	opponent: function opponent(player) {
		var playerIndex = this.players.indexOf(player || this.activePlayer());
		return this.players[(playerIndex + 1) % this.players.length];
	},

	// ### Game flow ###########################################################
	
	/** Since `next()` expects a moves object, the method 
	`perform(move, player=activePlayer, ...)` pretends to simplify simpler game
	mechanics. It performs the given moves for the given players (activePlayer
	by default) and returns the next game state.
	*/
	perform: function perform() {
		var moves = {}, move, player;
		for (var i = 0; i < arguments.length; i += 2) {
			player = arguments[i + 1];
			if (typeof player === 'undefined') {
				player = this.activePlayer();
			}
			moves[player] = arguments[i];
		}
		return this.next(moves);
	},

	/** The method `moves()` returns the available moves for each player. Yet 
	this is not the same as the `moves` objects that can be used with `next()` 
	to obtain a next game state. Furthermore, if there are more than one active
	player per turn, the possible decisions can be build with all combinations
	for all active players.
	
	The method `possibleMoves(moves=this.moves())` calculates all possible 
	`moves` objects based on the result of `moves()`. For example, if `moves()`
	returns `{A: [1,2], B: [3,4]}`, then `possibleMoves()` would return 
	`[{A:1,B:3}, {A:1,B:4}, {A:2,B:3}, {A:2,B:4}]`.
	*/
	possibleMoves: function possibleMoves(moves) {
		moves = arguments.length < 1 ? this.moves() : moves;
		if (!moves || typeof moves !== 'object') {
			return [];
		}
		var activePlayers = Object.keys(moves);
		if (activePlayers.length == 1) { // Most common case.
			var activePlayer = activePlayers[0];
			return moves[activePlayer].map(function (move) {
				return obj(activePlayer, move);
			});
		} else { // Simultaneous games.
			return Iterable.product.apply(this, 
				iterable(moves).mapApply(function (player, moves) {
					return moves.map(function (move) {
						return [player, move];
					});
				}).toArray()
			).map(function (playerMoves) {
				return iterable(playerMoves).toObject();
			}).toArray();
		}
	},
	
	// ### Result functions ####################################################

	/** The maximum and minimum results may be useful and even required by some 
	game search algorithm. To expose these values, `resultBounds()` returns an
	array with first the minimum and then the maximum. Most game have one type 
	of victory (+1) and one type of defeat (-1). That's why `resultBounds()` 
	returns [-1,+1] by default. Yet some games can define different bounds by 
	overriding it.
	*/
	resultBounds: function resultBounds() {
		return [-1,+1];
	},
	
	/** The `normalizedResult(result=this.result())` is the `result()` 
	expressed so the minimum defeat is equal to -1 and the maximum victory is 
	equal to +1.
	*/
	normalizedResult: function normalizedResult(result) {
		result = result || this.result();
		if (result) {
			var bounds = this.resultBounds();
			return iterable(result).mapApply(function (player, value) {
				return [player, (value - bounds[0]) / (bounds[1] - bounds[0]) * 2 - 1];
			}).toObject();
		} else {
			return null;
		}
	},
	
	/** Most games have victory and defeat results that cancel each other. It is
	said that all the victors wins the defeated player loses. Those games are
	called _zerosum games_. The method
	`zerosumResult(score, players=activePlayers)` builds a game result object
	for a zerosum game. The given score is split between the given players (the
	active players by default), and (-score) is split between their opponents.
	*/
	zerosumResult: function zerosumResult(score, players) {
		players = !players ? this.activePlayers : (!Array.isArray(players) ? [players] : players);
		score = (+score) / (players.length || 1);
		var result = ({}), player,
			opponentScore = -score / (this.players.length - players.length || 1);
		for (var i = 0; i < this.players.length; i++) {
			player = this.players[i];
			result[player] = players.indexOf(player) < 0 ? opponentScore : score;
		}
		return result;
	},

	/** There are two shortcuts for `zerosumResult()`. First 
	`victory(players=activePlayers, score=1)` returns the zero-sum game result
	with the given players (or the active players by default) as winners, and
	their opponents as losers.
	*/
	victory: function victory(players, score) {
		return this.zerosumResult(score || 1, players);
	},

	/** Second `defeat(players=activePlayers, score=-1)` returns the zero-sum
	game result with the given players (or the active players by default) as
	losers, and their opponents as winners.
	*/
	defeat: function defeat(players, score) {
		return this.zerosumResult(score || -1, players);
	},

	/** Finally `draw(players=this.players, score=0)` returns the game result of
	a tied game with the given players (or the active players by default) all 
	with the same score (zero by default). A tied game must always have the same
	result for all players.
	*/
	draw: function draw(players, score) {
		score = +(score || 0);
		players = players || this.players;
		var result = ({});
		for (var player in players) {
			result[players[player]] = score;
		}
		return result;
	},

	// ### Conversions & presentations #########################################

	/** Many methods are based in the serialization of the game instances. The
	abstract method `__serialize__()` should returns an array, where the first
	element should be the name of the game, and the rest are the arguments to
	call the game's constructor in order to rebuild this game's state.
	*/
	__serialize__: unimplemented("Game", "__serialize__"),
	
	/** Based on the game's serialization, `clone()` creates a copy of this game
	state.
	*/
	clone: function clone() {
		var args = this.__serialize__();
		args.shift(); // Remove first element (game's name).
		return new (this.constructor.bind.apply(this.constructor, args))();
	},

	/** Some algorithms require an `identifier()` for each game state, in order
	to store them in caches or hashes. This method calculates a string that 
	uniquely identifies this game state, based on the game's serialization.
	*/
	identifier: function identifier() {
		var args = this.__serialize__();
		return args.shift() + args.map(JSON.stringify).join('');
	},

	/** The default string representation of a game is also based on the 
	serialization. Changing this is not recommended.
	*/
	toString: function toString() {
		var args = this.__serialize__();
		return args.shift() +'('+ args.map(JSON.stringify).join(',') +')';
	},
	
	/** The default JSON representation (i.e. `toJSON()`) is a straight JSON
	stringification of the serialization. It may be used to transfer the game
	state between server and client, frames or workers.
	*/
	toJSON: function toJSON() {
		return JSON.stringify(this.__serialize__());
	},
	
	/** The static counterpart of `toJSON()` is `fromJSON()`, which creates a
	new instance of this game from the given JSON. The function in `Game` 
	abstract class finds the proper constructor with the game name and calls it.
	*/
	"static fromJSON": function fromJSON(data) {
		if (typeof data === 'string') {
			data = JSON.parse(data);
			raiseIf(!Array.isArray(data) || data.length < 1, "Invalid JSON data: "+ data +"!");
		} else {
			raiseIf(!Array.isArray(data) || data.length < 1, "Invalid JSON data: "+ data +"!");
			data = data.slice(); // Shallow copy.
		}
		var cons = games[data[0]];
		raiseIf(typeof cons !== 'function', "Unknown game '", data[0], "'!");
		if (typeof cons.fromJSON === 'function') {
			return cons.fromJSON(data); // Call game's fromJSON.
		} else { // Call game's constructor.
			data[0] = this; 
			return new (cons.bind.apply(cons, data))();
		}
	}
}); // declare Game.
	
/** The namespace `ludorum.games` contains all game implementations (as `Game`
subclasses) provided by this library.
*/
var games = exports.games = {};
	
// Serialized simultaneous games. //////////////////////////////////////////////
	
/** static Game.serialized():
	Builds a serialized version of this game, converting a simultaneous game to 
	an alternated turn based game.
*/
Game.serialized = function serialized() {
	var super_moves = this.prototype.moves,
		super_next = this.prototype.next;
	return declare(this, {
		/** Game.serialized.moves():
			Returns the moves of the player deemed as the active player, if 
			there are any moves.
		*/
		moves: function moves() {
			var fixedMoves = this.__fixedMoves__ || (this.__fixedMoves__ = {}),
				allMoves = super_moves.call(this),
				moves = {},
				activePlayer;
			for (var i = 0; i < this.activePlayers.length; i++) {
				if (fixedMoves.hasOwnProperty(this.activePlayers[i])) {
					activePlayer = this.activePlayers[i];
					break;
				}
			}
			if (activePlayer && allMoves) {
				moves[activePlayer] = allMoves[activePlayer];
				return moves;
			} else {
				return null;
			}
		},
	
		/** Game.serialized.next(moves):
			If with the given move all active players in the real game state
			have moves, then the actual game advances. Else the next player 
			that has to move becomes active.
		*/
		next: function next(moves) {
			var nextFixedMoves = copy({}, this.fixedMoves || {}, moves),
				allMoved = iterable(this.players).all(function (p) {
						return nextFixedMoves.hasOwnProperty(p);
					}),
				result;
			if (allMoved) {
				result = super_next.call(this, nextFixedMoves);
				result.fixedMoves = {};
			} else {
				result = this.clone();
				result.fixedMoves = nextFixedMoves;
			}
			return result;
		}
	});
}; // Game.serialized

// Cached games. ///////////////////////////////////////////////////////////////

/** static Game.cached():
	Returns a derived constructor is returned that caches the moves and result 
	methods. The next() method is not cached because it may lead to memory
	leaks or overload.
*/
Game.cached = function cached() {
	var super_moves = this.prototype.moves,
		super_result = this.prototype.result,
		super_next = this.prototype.next;
	return declare(this, {
		/** Game.cached.moves():
			The first time it is called, delegates to game.moves(), and 
			keeps the result for future calls.
		*/
		moves: function moves() {
			var result = super_moves.call(this);
			this.moves = function cachedMoves() { // Replace moves() method with cached version.
				return result;
			};
			return result;
		},
		
		/** Game.cached.result():
			The first time it is called, delegates to game.result(), and 
			keeps the result for future calls.
		*/
		result: function result() {
			var result = super_result.call(this);
			this.result = function cachedResult() { // Replace result() method with cached version.
				return result;
			};
			return result;
		}
	});
}; // Game.cached


/** ## Class Player

Player is the base type for all playing agents. Basically, playing a game means
choosing a move from all available ones, each time the game enables the player 
to do so.
*/
var Player = exports.Player = declare({
	/** The default constructor takes only its `name` from the given `params`.
	This is an abstract class that is meant to be extended.
	*/
	constructor: (function () {
		var __PlayerCount__ = 0; // Used by the Player's default naming.
		return function Player(params) {
			initialize(this, params)
				.string('name', { defaultValue: 'Player' + (__PlayerCount__++), coerce: true });
		};
	})(),

	/** A player is asked to choose a move by calling 
	`Player.decision(game, role)`. The result is the selected move if it can be 
	obtained synchronously, else a future is returned.
	*/
	decision: function decision(game, role) {
		return this.__moves__(game, role)[0]; // Indeed not a very thoughtful base implementation. 
	},

	/** To help implement the decision, `Player.__moves__(game, player)` gets
	the moves in the game for the player. It also checks if there are any moves,
	and if it not so an error is risen.
	*/
	__moves__: function __moves__(game, role) {
		var moves = game.moves();
		raiseIf(!moves || !moves[role] || moves[role].length < 1, 
			"Player ", role, " has no moves for game ", game, ".");
		return moves[role];
	},
	
	/** Before starting a [match](Match.html), all players are asked to join
	by calling `Player.participate(match, role)`. This allows the player to
	prepare properly. If this implies building another instance of the player 
	object, it must be returned in order to participate in the match.
	*/
	participate: function participate(match, role) {
		return this;
	},
	
	// ### Conversions & presentations #########################################

	/** Players can also be serialized, pretty much in the same way 
	[games](Game.html) are. `Player.__serialize__()` returns an array, where the 
	first element should be the name of the game, and the rest the arguments to 
	call the player's constructor in order to rebuild this player's state.
	*/
	__serialize__: function __serialize__() {
		return [this.constructor.name, {name: this.name}];
	},
	
	/** The string representation of the player is derived straight from its
	serialization.
	*/
	toString: function toString() {
		var args = this.__serialize__();
		return args.shift() +'('+ args.map(JSON.stringify).join(',') +')';
	}
}); // declare Player.

/** The namespace `ludorum.players` contains all kinds of players provided by
this library: artificial intelligences, user interface proxies and others.
*/
var players = exports.players = {};

/** ## Class Match

A match is a controller for a game, managing player decisions, handling the flow
of the turns between the players by following the game's logic.
*/
var Match = exports.Match = declare({
	/** `Match` objects are build with the [game's](Game.html) starting state 
	and the players that participate. The players argument must be either an 
	array of [`Player`](Player.html) objects or an object with a member for each
	of the game's players with a Player object as value.
	*/
	constructor: function Match(game, players) {
		this.game = game;
		this.players = Array.isArray(players) ? iterable(game.players).zip(players).toObject() : players;
		/** The match records the sequence of game state in `Match.history`.
		*/
		this.history = [game];
		this.events = new Events({ 
			events: ['begin', 'move', 'next', 'end', 'quit']
		});
		for (var p in this.players) { // Participate the players.
			this.players[p] = this.players[p].participate(this, p) || this.players[p];
		}
	},

	/** Each step in the match's history is called a ply. `Match.ply()` 
	indicates the current ply number.
	*/
	ply: function ply() {
		return this.history.length - 1;
	},
	
	/** Each ply has a game state. `Match.state(ply=last)` retrieves the game 
	state for the given ply, or the last one by default.
	*/
	state: function state(ply) {
		ply = isNaN(ply) ? this.ply() : +ply < 0 ? this.ply() + (+ply) : +ply;
		return this.history[ply | 0];
	},

	/** If the last game state is finished, then the whole match is finished. If
	so, `Match.result()` returns the match result, which is the result of the 
	last game state.
	*/
	result: function result() {
		return this.state().result();
	},

	/** If the last game state is not finished, then the match continues. To
	move the play on, `Match.decisions(game=state())` asks the active players in 
	the game to choose their moves. Returns a future that is resolved when all 
	players have decided.
	*/
	decisions: function decisions(game) {
		game = game || this.state();
		var match = this,
			players = this.players,
			activePlayers = game.activePlayers;
		return Future.all(activePlayers.map(function (p) {
			return players[p].decision(game, p);
		})).then(function (decisions) {
			var moves = iterable(activePlayers).zip(decisions).toObject();
			match.onMove(game, moves);
			return moves;
		});
	},

	/** `Match.run(plys=Infinity)` runs the match the given number of plys, or 
	until the game finishes. The result is a future that gets resolved when the
	game ends.
	*/
	run: function run(plys) {
		plys = isNaN(plys) ? Infinity : +plys;
		if (plys < 1) { // If the run must stop...
			return Future.when(this);
		}
		var ply = this.ply(), game = this.state(), results, next;
		(ply < 1) && this.onBegin(game);
		game = this.__advanceAleatories__(game); // Instantiate all random variables.
		results = game.result();
		if (results) { // If the match has finished ...
			this.onEnd(game, results);
			return Future.when(this);
		} else { // Else the run must continue ...
			var match = this;
			return this.decisions(game).then(function (moves) {
				if (match.__advance__(game, moves)) {
					return match.run(plys - 1);
				} else {
					return match;
				}				
			});
		}
	},
	
	__advanceAleatories__: function __advanceAleatories__(game, moves) {
		for (var next; game instanceof Aleatory; game = next) {
			next = game.next();
			this.history.push(next);
			this.onNext(game, next);
		}
		return game;
	},
	
	__advance__: function __advance__(game, moves) {
		var match = this,
			quitters = game.activePlayers.filter(function (p) {
				return moves[p] instanceof Match.CommandQuit;
			});
		if (quitters.length > 0) {
			match.onQuit(game, quitters[0]);
			return false;
		}
		var next = game.next(moves); // Match must go on.
		this.history.push(next);
		this.onNext(game, next);
		return true;
	},
	
	/** ### Commands ###########################################################
	
	Commands are pseudo-moves, which can be returned by the players instead of
	valid moves for the game being played. Their intent is to control the match
	itself.
	
	The available commands are:
	*/
	
	/** + `CommandQuit()`: A quit command means the player that issued it is 
	leaving the match. The match is then aborted.
	*/
	"static CommandQuit": function CommandQuit() { },
	
	/** ### Events #############################################################
	
	Matches provide game events that players and spectators can be registered 
	to. `Match.events` is the event handler. Emitted events are:
	*/
	
	/** + The `begin` event fired by `Match.onBegin(game)` when the match 
	begins. The callbacks should have the signature `function (game, match)`.
	*/
	onBegin: function onBegin(game) {
		this.events.emit('begin', game, this);
		this.logger && this.logger.info('Match begins with ', 
			iterable(this.players).map(function (attr) {
				return attr[1] +' as '+ attr[0];
			}).join(', '), '; for ', game, '.');
	},
	
	/** + The `move` event fired by `Match.onMove(game, moves)` every time the
	active players make moves. The callbacks should have the signature 
	`function (game, moves, match)`.
	*/
	onMove: function onMove(game, moves) {
		this.events.emit('move', game, moves, this);
		this.logger && this.logger.info('Players move: ', JSON.stringify(moves), ' in ', game);
	},
	
	/** + The `next` event fired by `Match.onNext(game, next)` signals when the
	match advances to the next game state. This may be due to moves or aleatory
	instantiation.  The callbacks should have the signature 
	`function (gameBefore, gameAfter, match)`.
	*/
	onNext: function onNext(game, next) {
		this.events.emit('next', game, next, this);
		this.logger && this.logger.info('Match advances from ', game, ' to ', next);
	},
	
	/** + The `end` event triggered by `Match.onEnd(game, results)` notifies 
	when the match ends.  The callbacks should have the signature 
	`function (game, result, match)`.
	*/
	onEnd: function onEnd(game, results) {
		this.events.emit('end', game, results, this);
		this.logger && this.logger.info('Match for ', game, 'ends with ', JSON.stringify(results));
	},
	
	/** + The `quit` event triggered by `Match.onQuit(game, player)` is emitted
	when the match is aborted due to the given player leaving it. The callbacks 
	should have the signature `function (game, quitter, match)`.
	*/
	onQuit: function onQuit(game, player) {
		this.events.emit('quit', game, player, this);
		this.logger && this.logger.info('Match for ', game, ' aborted because player '+ player +' quitted.');
	},
	
	toString: function toString() {
		return 'Match('+ this.game +', '+ JSON.stringify(this.players) +')';
	}
}); // declare Match.


/** ## Class Tournament

A tournament is a set of matches played between many players. The whole contest 
ranks the participants according to the result of the matches. This is an 
abstract base class for many different types of contests.
*/
var Tournament = exports.Tournament = declare({
	constructor: function Tournament(game, players) {
		/** The tournament always has one [`game`](Game.html) state from which 
		all matches start.
		*/
		this.game = game;
		/** All the [`players`](Player.html) involved in the tournament must be
		provided to the constructor in an array.
		*/
		this.players = Array.isArray(players) ? players : iterables.iterable(players).toArray();
		this.statistics = new Statistics();
		this.events = new Events({ 
			events: ['begin', 'beforeMatch', 'afterMatch', 'end']
		});
	},

	/** The next match to be played is determined by `__advance__`, which 
	returns a match instance, or null if the tournament has finished. It is not 
	implemented in this base class. 
	*/
	__advance__: unimplemented("Tournament", "__advance__"),
	
	/** `Tournament.run()` plays all the tournament's matches. Since running a 
	match is asynchronous, running a tournament is too. Hence the result is 
	always a future, which will be resolved when all matches have been played.
	*/
	run: function run() {
		this.onBegin();
		var tournament = this;
		return Future.doWhile(function () {
			return Future.then(tournament.__advance__(), function (match) {
				if (match) {
					tournament.beforeMatch(match);
					return tournament.__runMatch__(match).then(function (match) {
						tournament.account(match);
						tournament.afterMatch(match);
						return match;
					});
				} else {
					return null;
				}
			});
		}).then(this.onEnd.bind(this));
	},
	
	/** The method `__runMatch__` runs a match. It is present so it can be 
	overridden, to implement some specific behaviour of the contest.
	*/
	__runMatch__: function __runMatch__(match) {
		return match.run();
	},
	
	/** Tournaments gather information from the played matches using their
	`statistics` property (instance of `creatartis-base.Statistics`). The method 
	`Tournament.account(match)` is called to accounts the results of each 
	finished match for the players' score.
	
	The match results are gathered in the `results` key. The keys `victories`,
	`defeats` and `draws` count each result type. The length of each game is
	recorded under `length`. The move count at each ply is aggregated under
	`width`. All these numbers are open by game, role, player.
	*/
	account: function account(match) {
		var game = this.game,
			results = match.result(), 
			isDraw = false,
			stats = this.statistics;
		raiseIf(!results, "Match doesn't have results. Has it finished?");
		iterable(match.players).forEach(function (p) { // Player statistics.
			var role = p[0],
				player = p[1],
				playerResult = results[p[0]];
			stats.add({key:'results', game:game.name, role:role, player:player.name}, 
				playerResult);
			stats.add({key:(playerResult > 0 ? 'victories' : playerResult < 0 ? 'defeats' : 'draws'),
				game:game.name, role:role, player:player.name}, playerResult);
			stats.add({key:'length', game:game.name, role:role, player:player.name}, 
				match.ply()); //FIXME This may not be accurate if the game has random variables.
			match.history.forEach(function (entry) {
				if (typeof entry.moves === 'function') {
					var moves = entry.moves();	
					if (moves && moves.hasOwnProperty(role) && moves[role].length > 0) {
						stats.add({key:'width', game:game.name, role:role, player:player.name}, 
							moves[role].length);
					}
				}
			})
		});
	},
	
	/** ### Events #############################################################
	
	Tournaments provide events to enable further analysis and control over it. 
	`Tournament.events` is the event handler. The emitted events are:
	*/
	
	/** + The `begin` event fired by `Tournament.onBegin()` when the whole 
	contest begins. The callbacks should have the signature 
	`function (tournament)`.
	*/	
	onBegin: function onBegin() {
		this.events.emit('begin', this);
		this.logger && this.logger.info('Tournament begins for game ', game.name, '.');
	},
	
	/** + The `beforeMatch` event triggered by `Tournament.beforeMatch(match)` 
	just before starting a match. The callbacks should have the signature 
	`function (match, tournament)`.
	*/
	beforeMatch: function beforeMatch(match) {
		this.events.emit('beforeMatch', match, this);
		this.logger && this.logger.debug('Beginning match with ', JSON.stringify(match.players), '.');
	},
	
	/** + The `afterMatch` event triggered by `Tournament.afterMatch(match)` 
	just after a match ends. The callbacks should have the signature 
	`function (match, tournament)`.
	*/
	afterMatch: function afterMatch(match) {
		this.events.emit('afterMatch', match, this);
		this.logger && this.logger.debug('Finishing match with ', JSON.stringify(match.players), '.');
	},
	
	/** + The `end` event triggered by `Tournament.onEnd()` when the whole 
	contest is completed. The callbacks should have the signature 
	`function (statistics, tournament)`.
	*/
	onEnd: function onEnd() {
		this.events.emit('end', this.statistics, this);
		this.logger && this.logger.info('Tournament ends for game ', game.name, ':\n', this.statistics, '\n');
	}
}); // declare Tournament

/** The namespace `ludorum.tournaments` holds several contest types implemented 
as Tournament subtypes.
*/
var tournaments = exports.tournaments = {};

/** ## Class Aleatory

Aleatories are representations of intermediate game states that depend on some 
form of randomness. `Aleatory` is an abstract class from which different means
of non determinism can be build, like: dice, card decks, roulettes, etcetera.
*/
var Aleatory = exports.Aleatory = declare({
	/** The constructor may take a next function and a random generator (an
	instance of `creatartis-base.Randomness`).
	*/
	constructor: function Aleatory(next, random) {
		this.random = random || Randomness.DEFAULT;
		if (typeof next === 'function') {
			this.next = next;
		}
	},
	
	/** The aleatory is always related to a random variable of some sort. The
	`Aleatory.value()` can be used to obtain a valid random value for that 
	random variable.
	*/
	value: function value() {
		var n = random.random(), value;
		iterable(this.distribution()).forEach(function (pair) {
			n -= pair[1];
			if (n <= 0) {
				value = pair[0];
				throw Iterable.STOP_ITERATION;
			}
		});
		if (typeof value === 'undefined') {
			throw new Error("Random value could not be obtained.");
		}
		return value;
	},
	
	/** The function `Aleatory.next(value)` returns the next game state given a 
	specific value for the random variable. This next game state may also be
	another `Aleatory`, or the corresponding [`Game`](Game.html) instance.
	If no value is given, then a random valid value is chosen, using the 
	`Aleatory.random` randomness generator.
	*/
	next: unimplemented("Aleatory", "next"),
	
	/** In order to properly search a game tree with aleatory nodes, the random
	variables' distribution have to be known. `Aleatory.distribution()` computes
	the histogram for the random variables on which this aleatory depends, as a
	sequence of pairs `[value, probability]`.
	*/
	distribution: unimplemented("Aleatory", "distribution")
}); // declare Aleatory.

/** The namespace `ludorum.aleatories` is a bundle of random game states (i.e. 
Aleatory subclasses) and related definitions.
*/
var aleatories = exports.aleatories = {};

/** ## Class RandomPlayer

Automatic players that moves fully randomly.
*/	
players.RandomPlayer = declare(Player, {
	/** The constructor takes the player's `name` and a `random` number 
	generator (`Randomness.DEFAULT` by default).
	*/
	constructor: function RandomPlayer(params) {
		Player.call(this, params);
		initialize(this, params)
			.object('random', { defaultValue: Randomness.DEFAULT });
	},

	/** The `decision(game, player)` is made completely at random.
	*/
	decision: function(game, player) {
		return this.random.choice(this.__moves__(game, player));
	}
}); // declare RandomPlayer.


/** ## Class TracePlayer

Automatic player that is scripted previously.
*/
players.TracePlayer = declare(Player, {
	/** The constructor takes the player's `name` and the `trace` as an 
	sequence of moves to make.
	*/
	constructor: function TracePlayer(params) {
		Player.call(this, params);
		this.trace = iterable(params.trace);
		this.__iterator__ = this.trace.__iter__();
		this.__decision__ = this.__iterator__();
	},

	/** The `decision(game, player)` returns the next move in the trace, or the 
	last one if the trace has ended.
	*/
	decision: function(game, player) {
		try {
			this.__decision__ = this.__iterator__();
		} catch (err) {
			Iterable.prototype.catchStop(err);
		}
		return this.__decision__;
	},
	
	__serialize__: function __serialize__() {
		return ['TracePlayer', { name: this.name, trace: this.trace.toArray() }];
	}
}); // declare TracePlayer.


/** ## Class HeuristicPlayer

This is the base type of automatic players based on heuristic evaluations of 
game states or moves.
*/
var HeuristicPlayer = players.HeuristicPlayer = declare(Player, {
	/** The constructor takes the player's `name` and a `random` number 
	generator (`base.Randomness.DEFAULT` by default). Many heuristic can be 
	based on randomness, but this is also necessary to chose between moves with
	the same evaluation without any bias.
	*/
	constructor: function HeuristicPlayer(params) {
		Player.call(this, params);
		initialize(this, params)
			.object('random', { defaultValue: Randomness.DEFAULT })
			.func('heuristic', { ignore: true });
	},

	/** An `HeuristicPlayer` choses the best moves at any given game state. For
	this purpose it evaluates every move with 
	`moveEvaluation(move, game, player)`. By default this function evaluates
	the states resulting from making each move, which is the most common thing
	to do.
	*/
	moveEvaluation: function moveEvaluation(move, game, player) {
		return this.stateEvaluation(game.next(obj(player, move)), player);
	},

	/** The `stateEvaluation(game, player)` calculates a number as the 
	assessment of the given game state for the given player. The base 
	implementation returns the result for the player is the game has results, 
	else it returns the heuristic value for the state.
	*/
	stateEvaluation: function stateEvaluation(game, player) {
		var gameResult = game.result();
		return gameResult ? gameResult[player] : this.heuristic(game, player);
	},

	/** The `heuristic(game, player)` is an evaluation used at states that are 
	not finished games. The default implementation returns a random number in 
	[-0.5, 0.5). This is only useful in testing. Any serious use should redefine 
	this.
	*/
	heuristic: function heuristic(game, player) {
		return this.random.random(-0.5, 0.5);
	},
	
	/** The `bestMoves(evaluatedMoves)` are all the best evaluated in the given
	sequence of tuples [move, evaluation].
	*/
	bestMoves: function bestMoves(evaluatedMoves) {
		return iterable(evaluatedMoves).greater(function (pair) {
			return pair[1];
		}).map(function (pair) {
			return pair[0];
		});
	},
	
	/** `selectMoves(moves, game, player)` return an array with the best 
	evaluated moves. The evaluation is done with the `moveEvaluation` method. 
	The default implementation always returns a `Future`.
	*/
	selectMoves: function selectMoves(moves, game, player) {
		var heuristicPlayer = this,
			asyncEvaluations = false,
			evaluatedMoves = moves.map(function (move) {
				var e = heuristicPlayer.moveEvaluation(move, game, player);
				if (e instanceof Future) {
					asyncEvaluations = asyncEvaluations || true;
					return e.then(function (e) {
						return [move, e];
					});
				} else {
					return [move, e];
				}
			});
		if (asyncEvaluations) { // Avoid using Future if possible.
			return Future.all(evaluatedMoves).then(this.bestMoves);
		} else {
			return this.bestMoves(evaluatedMoves);
		}
	},
	
	/** The `decision(game, player)` selects randomly from the best evaluated 
	moves.
	*/
	decision: function decision(game, player) {
		var heuristicPlayer = this,
			selectedMoves = heuristicPlayer.selectMoves(heuristicPlayer.__moves__(game, player), game, player);
		return Future.then(selectedMoves, function (selectedMoves) {
			return heuristicPlayer.random.choice(selectedMoves);
		});
	}
}); // declare HeuristicPlayer.


/** Automatic players based on the MaxN algorithm.
*/
var MaxNPlayer = players.MaxNPlayer = declare(HeuristicPlayer, {
	/** new players.MaxNPlayer(params):
		Builds a player that chooses its moves using the MiniMax algorithm with
		alfa-beta pruning.
	*/
	constructor: function MaxNPlayer(params) {
		HeuristicPlayer.call(this, params);
		initialize(this, params)
		/** players.MaxNPlayer.horizon=3:
			Maximum depth for the MiniMax search.
		*/
			.integer('horizon', { defaultValue: 3, coerce: true })
	},

	/** players.MaxNPlayer.stateEvaluation(game, player):
		Returns the minimax value for the given game and player.
	*/
	stateEvaluation: function stateEvaluation(game, player) {
		return this.maxN(game, player, 0)[player];
	},

	/** players.MaxNPlayer.heuristics(game):
		Returns the heuristics value for each players in the game, as an object.
	*/
	heuristics: function heuristic(game) {
		var result = {}, maxN = this;
		game.players.forEach(function (role) {
			result[role] = maxN.heuristic(game, role);
		});
		return result;
	},

	/** players.MaxNPlayer.quiescence(game, player, depth):
		An stability test for the given game state. If the game is quiescent, 
		this function must return evaluations. Else it must return null. 
		Final game states are always quiescent, and their evaluations are the 
		game's result for each player. This default implementation also return 
		heuristic evaluations for every game state at a deeper depth than the 
		player's horizon.
	*/
	quiescence: function quiescence(game, player, depth) {
		var results = game.result();
		if (results) {
			return results;
		} else if (depth >= this.horizon) {
			return this.heuristics(game);
		} else {
			return null;
		}
	},
	
	/** players.MaxNPlayer.maxN(game, player, depth):
		Return the evaluations for each player of the given game, assuming each
		player tries to maximize its own evaluation regardless of the others'.
	*/
	maxN: function maxN(game, player, depth) {
		var values = this.quiescence(game, player, depth);
		if (!values) { // game is not quiescent.
			var activePlayer = game.activePlayer(),
				moves = this.__moves__(game, activePlayer),
				values = {},
				otherValues, next;
			if (moves.length < 1) {
				throw new Error('No moves for unfinished game '+ game +'.');
			}
			for (var i = 0; i < moves.length; ++i) {
				next = game.next(obj(activePlayer, moves[i]));
				otherValues = this.maxN(next, player, depth + 1);
				if (otherValues[activePlayer] > (values[activePlayer] || -Infinity)) {
					values = otherValues;
				}
			}
		}
		return values;
	},
	
	toString: function toString() {
		return (this.constructor.name || 'MaxNPlayer') +'('+ JSON.stringify({
			name: this.name, horizon: this.horizon
		}) +')';
	}
}); // declare MiniMaxPlayer.


/** ## Class MiniMaxPlayer

Automatic players based on pure MiniMax.
*/
var MiniMaxPlayer = players.MiniMaxPlayer = declare(HeuristicPlayer, {
	/** The constructor takes the player's `name` and the MiniMax search's 
	`horizon` (`4` by default).
	*/
	constructor: function MiniMaxPlayer(params) {
		HeuristicPlayer.call(this, params);
		initialize(this, params)
			.integer('horizon', { defaultValue: 4, coerce: true });
	},

	/** Every state's evaluation is the minimax value for the given game and 
	player.
	*/
	stateEvaluation: function stateEvaluation(game, player) {
		return this.minimax(game, player, 0);
	},

	/** The `quiescence(game, player, depth)` method is a stability test for the 
	given game state. If the game is quiescent, this function must return an 
	evaluation. Else it must return NaN or an equivalent value. 
	
	Final game states are always quiescent, and their evaluation is the game's
	result for the given player. This default implementation also return an 
	heuristic evaluation for every game state at a deeper depth than the 
	player's horizon.
	*/
	quiescence: function quiescence(game, player, depth) {
		var results = game.result();
		if (results) {
			return results[player];
		} else if (depth >= this.horizon) {
			return this.heuristic(game, player);
		} else {
			return NaN;
		}
	},
	
	/** The `minimax(game, player, depth)` method calculates the Minimax 
	evaluation of the given game for the given player. If the game is not 
	finished and the depth is greater than the horizon, `heuristic` is used.
	*/
	minimax: function minimax(game, player, depth) {
		var value = this.quiescence(game, player, depth);
		if (isNaN(value)) { // game is not quiescent.
			var activePlayer = game.activePlayer(),
				moves = this.__moves__(game, activePlayer), 
				comparison, next;
			if (moves.length < 1) {
				throw new Error('No moves for unfinished game '+ game +'.');
			}
			if (activePlayer == player) {
				value = -Infinity;
				comparison = Math.max;
			} else {
				value = +Infinity;
				comparison = Math.min;
			}
			for (var i = 0; i < moves.length; ++i) {
				next = game.next(obj(activePlayer, moves[i]));
				value = comparison(value, this.minimax(next, player, depth + 1));
			}
		}
		return value;
	},
	
	toString: function toString() {
		return (this.constructor.name || 'MiniMaxPlayer') +'('+ JSON.stringify({
			name: this.name, horizon: this.horizon
		}) +')';
	}
}); // declare MiniMaxPlayer.


/** ## Class AlphaBetaPlayer

Automatic players based on MiniMax with alfa-beta pruning.
*/
players.AlphaBetaPlayer = declare(MiniMaxPlayer, {
	/** The constructor does not add anything to the parent
	[`MiniMaxPlayer`](MiniMaxPlayer.js.html) constructor.
	*/
	constructor: function AlphaBetaPlayer(params) {
		MiniMaxPlayer.call(this, params);
	},

	/** Every state's evaluation is the minimax value for the given game and 
	player. The alfa an beta arguments are initialized with `-Infinity` and
	`Infinity`.
	*/
	stateEvaluation: function stateEvaluation(game, player) {
		return this.minimax(game, player, 0, -Infinity, Infinity);
	},

	/** The `minimax(game, player, depth, alfa, beta)` method calculates the 
	Minimax evaluation of the given game for the given player. If the game is 
	not finished and the depth is greater than the horizon, the heuristic is
	used.
	*/
	minimax: function minimax(game, player, depth, alpha, beta) {
		var value = this.quiescence(game, player, depth);
		if (!isNaN(value)) {
			return value;
		}
		var activePlayer = game.activePlayer(),
			isActive = activePlayer == player,
			moves = this.__moves__(game, activePlayer), next;
		if (moves.length < 1) {
			throw new Error('No moves for unfinished game '+ game +'.');
		}
		for (var i = 0; i < moves.length; i++) {
			next = game.next(obj(activePlayer, moves[i]));
			value = this.minimax(next, player, depth + 1, alpha, beta);
			if (isActive) {
				if (alpha < value) { // MAX
					alpha = value;
				}
			} else {
				if (beta > value) { // MIN
					beta = value;
				}
			}
			if (beta <= alpha) {
				break;
			}
		}
		return isActive ? alpha : beta;
	}
}); // declare AlphaBetaPlayer.


/** Automatic player based on pure Monte Carlo tree search.
*/
players.MonteCarloPlayer = declare(HeuristicPlayer, {
	/** new players.MonteCarloPlayer(params):
		Builds a player that chooses its moves using the [pure Monte Carlo game
		tree search method](http://en.wikipedia.org/wiki/Monte-Carlo_tree_search).
	*/
	constructor: function MonteCarloPlayer(params) {
		HeuristicPlayer.call(this, params);
		initialize(this, params)
		/** players.MonteCarloPlayer.simulationCount=30:
			Maximum amount of simulations performed for each available move at
			each decision.
		*/
			.number('simulationCount', { defaultValue: 30, coerce: true })
		/** players.MonteCarloPlayer.timeCap=1000ms:
			Time limit for the player to decide.
		*/
			.number('timeCap', { defaultValue: 1000, coerce: true })
		/** players.MonteCarloPlayer.agent:
			Player instance used in the simulations. If undefined moves are
			chosen at random.
			Warning! Agent with asynchronous decisions are not supported.
		*/
			.object('agent', { defaultValue: null });
	},
	
	/** players.MonteCarloPlayer.selectMoves(moves, game, player):
		Return an array with the best evaluated moves.
	*/
	selectMoves: function selectMoves(moves, game, player) {
		var monteCarloPlayer = this,
			endTime = Date.now() + this.timeCap,
			options = moves.map(function (move) {
				return { move: move, next: game.next(obj(player, move)), 
					isFinal: false, sum: 0, count: 0 
				};
			});
		for (var i = 0; i < this.simulationCount && Date.now() < endTime; ++i) {
			options.forEach(function (option) {
				if (!option.isFinal) {
					var sim = monteCarloPlayer.simulation(option.next, player);
					option.isFinal = sim.plies < 1;
					option.sum += sim.result[player];
					++option.count;
				}
			});
		}
		return iterable(options).greater(function (option) {
			return option.count > 0 ? option.sum / option.count : 0;
		}).map(function (option) {
			return option.move;
		});
	},
	
	/** players.MonteCarloPlayer.stateEvaluation(game, player):
		Runs this.simulationCount simulations and returns the average result.
	*/
	stateEvaluation: function stateEvaluation(game, player) {
		var resultSum = 0, 
			simulationCount = this.simulationCount,
			sim;
		for (var i = 0; i < simulationCount; ++i) {
			sim = this.simulation(game, player);
			resultSum += sim.result[player];
			if (sim.plies < 1) { // game is final.
				break;
			}
		}
		return simulationCount > 0 ? resultSum / simulationCount : 0;
	},
	
	/** players.MonteCarloPlayer.simulation(game, player):
		Simulates a random match from the given game and returns an object with
		the final state (game), its result (result) and the number of plies 
		simulated (plies).
	*/
	simulation: function simulation(game, player) {
		var mc = this,
			plies, move, moves;
		for (plies = 0; true; ++plies) {
			if (game instanceof Aleatory) {
				game = game.next();
			} else {
				moves = game.moves();
				if (!moves) {
					return { game: game, result: game.result(), plies: plies };
				}
				move = {};
				game.activePlayers.forEach(function (activePlayer) {
					move[activePlayer] = mc.agent ? mc.agent.decision(game, activePlayer) 
						: mc.random.choice(moves[activePlayer]);
				});
				game = game.next(move);
			}
		}
		return { game: game, result: game.result(), plies: plies };
	},
	
	toString: function toString() {
		return (this.constructor.name || 'MonteCarloPlayer') +'('+ JSON.stringify({
			name: this.name, simulationCount: this.simulationCount, timeCap: this.timeCap
		}) +')';
	}
}); // declare MonteCarloPlayer


/** Implementation of player user interfaces and proxies in the Ludorum 
	library.
*/
var UserInterfacePlayer = players.UserInterfacePlayer = declare(Player, {
	/** new players.UserInterfacePlayer(params):
		Base class of all players that are proxies of user interfaces.
	*/
	constructor: function UserInterfacePlayer(params) {
		Player.call(this, params);
	},

	/** players.UserInterfacePlayer.participate(match, role):
		Assigns this players role to the given role.
	*/
	participate: function participate(match, role) {
		this.role = role;
		return this;
	},
	
	/** players.UserInterfacePlayer.decision(game, player):
		Returns a future that will be resolved when the perform() method is 
		called.
	*/
	decision: function decision(game, player) {
		if (this.__future__ && this.__future__.isPending()) {
			this.__future__.resolve(new Match.CommandQuit());
		}
		return this.__future__ = new Future();
	},
	
	/** players.UserInterfacePlayer.perform(action):
		Resolves the decision future. This method is meant to be called by 
		the user interface.
	*/
	perform: function perform(action) {
		var future = this.__future__;
		if (future) {
			this.__future__ = null;
			future.resolve(action);
		}
		return !!future;
	}
}); // declare UserInterfacePlayer.

var UserInterface = players.UserInterface = declare({ ////////////////////
	/** new players.UserInterface(match, config):
		Base class for user interfaces that display a game and allow one
		or more players to play.
	*/
	constructor: function UserInterface(config) {
		this.onBegin = this.onBegin.bind(this);
		this.onNext = this.onNext.bind(this);
		this.onEnd = this.onEnd.bind(this);
		if (config.match) {
			this.show(config.match);
		}
	},
	
	/** players.UserInterface.show(match):
		Discards the current state and sets up to display the given match.
	*/
	show: function show(match) {
		if (this.match) {
			match.events.off('begin', this.onBegin);
			match.events.off('next', this.onNext);
			match.events.off('end', this.onEnd);
		}
		this.match = match;
		match.events.on('begin', this.onBegin);
		match.events.on('next', this.onNext);
		match.events.on('end', this.onEnd);
	},
	
	/** players.UserInterface.onBegin(game):
		Handler for the 'begin' event of the match.
	*/
	onBegin: function onBegin(game) {
		this.display(game);
	},
	
	/** players.UserInterface.onNext(game, next):
		Handler for the 'move' event of the match.
	*/
	onNext: function onNext(game, next) {
		this.display(next);
	},
	
	/** players.UserInterface.onEnd(game, results):
		Handler for the 'end' event of the match.
	*/
	onEnd: function onEnd(game, results) {
		this.results = results;
		this.display(game);
	},
	
	/** players.UserInterface.display(game):
		Renders the game in this user interface. Not implemented, so please
		override.
	*/
	display: function display(game) {
		throw new Error("UserInterface.display is not defined. Please override.");
	},
	
	/** players.UserInterface.perform(action, actionRole=undefined):
		Makes the given player perform the action if the player has a 
		perform method and is included in this UI's players.
	*/
	perform: function perform(action, actionRole) {
		iterable(this.match.players).forEach(function (pair) {
			var role = pair[0], player = pair[1];
			if (player instanceof UserInterfacePlayer 
			&& (!actionRole || player.role === actionRole)) {
				player.perform(action);
			}
		});
	}
}); // declare UserInterface.
	
UserInterface.BasicHTMLInterface = declare(UserInterface, { //////////////
	/** new players.UserInterface.BasicHTMLInterface(match, players, domElement):
		Simple HTML based UI, that renders the game to the given domElement
		using its toHTML method.
	*/
	constructor: function BasicHTMLInterface(config) {
		UserInterface.call(this, config);
		this.container = config.container;
		if (typeof this.container === 'string') {
			this.container = document.getElementById(this.container);
		}
	},

	/** players.UserInterface.BasicHTMLInterface.display(game):
		When the player is participated of a match, a callback is registered
		to the match's events. This method renders the game to HTML at each 
		step in the match.
	*/
	display: function display(game) {
		var ui = this, 
			container = this.container;
		container.innerHTML = game.toHTML();
		Array.prototype.slice.call(container.querySelectorAll('[data-ludorum]')).forEach(function (elem) {
			var data = eval('({'+ elem.getAttribute('data-ludorum') +'})');
			if (data.hasOwnProperty('move')) {
				elem.onclick = ui.perform.bind(ui, data.move, data.activePlayer);
			}
		});
	}
}); // declare HTMLInterface.


/** A proxy for another player executing inside a webworker.
*/
var WebWorkerPlayer = players.WebWorkerPlayer = declare(Player, {
	/** new players.WebWorkerPlayer(params):
		Builds a player that is a proxy for another player executing in a web
		worker.
	*/
	constructor: function WebWorkerPlayer(params) {
		Player.call(this, params);
		initialize(this, params)
		/** players.WebWorkerPlayer.worker:
			The Worker instance where the actual player is executing.
		*/
			.object('worker');
		this.worker.onmessage = base.Parallel.prototype.__onmessage__.bind(this);
	},
	
	/** static WebWorkerPlayer.createWorker(playerBuilder):
		Asynchronously creates and initializes a web worker. The modules 
		creatartis-base and	ludorum are loaded in the global namespace (self), 
		before calling the given playerBuilder function. Its results will be 
		stored in the global variable PLAYER.
	*/
	"static createWorker": function createWorker(playerBuilder) {
		raiseIf('string function'.indexOf(typeof playerBuilder) < 0, 
			"Invalid player builder: "+ playerBuilder +"!");
		var parallel = new base.Parallel();
		return parallel.run('self.ludorum = ('+ exports.__init__ +')(self.base), "OK"'
			).then(function () {
				return parallel.run('self.PLAYER = ('+ playerBuilder +').call(self), "OK"');
			}).then(function () {
				return parallel.worker;
			});
	},
	
	/** static WebWorkerPlayer.create(params):
		Asynchronously creates and initializes a WebWorkerPlayer, with a web 
		worker ready to play. The params must include the playerBuilder function
		to execute on the web worker's environment.
	*/
	"static create": function create(params) {
		var WebWorkerPlayer = this;
		return WebWorkerPlayer.createWorker(params.playerBuilder).then(function (worker) {
			return new WebWorkerPlayer({name: name, worker: worker}); 
		});
	},
	
	/** players.WebWorkerPlayer.decision(game, player):
		The decision is delegated to this player's webworker, returning a future
		that will be resolved when the parallel execution is over. 
		Warning! If this method is called while another decision is pending, the 
		player will assume the previous match was aborted, issuing a QUIT 
		command.
	*/
	decision: function decision(game, player) {
		if (this.__future__ && this.__future__.isPending()) {
			this.__future__.resolve(Match.commandQuit);
		}
		this.__future__ = new Future();
		this.worker.postMessage('PLAYER.decision(ludorum.Game.fromJSON('+ game.toJSON() 
			+'), '+ JSON.stringify(player) +')');
		return this.__future__;
	}
}); // declare WebWorkerPlayer

/** ## Class Dice

[Aleatory](../Aleatory.js.html) representation of dice random variables. These
are uniformly distributed values in the range `[1, base]`.
*/
aleatories.Dice = declare(Aleatory, {
	/** The constructor takes the next function, the dice base, and	a 
	pseudorandom number generator (`creatartis-base.Randomness.DEFAULT` by 
	default).
	*/
	constructor: function Dice(next, base, random) {
		Aleatory.call(this, next, random);
		/** A dice's `base` is the maximum value it can have. By default is 6, 
		since most frequently six sided dice are used.
		*/
		this.base = isNaN(base) ? 6 : Math.max(2, +base);
	},
	
	/** `Dice.value()` returns a random value between 1 and `base`.
	*/
	value: function value() {
		return this.random.randomInt(1, this.base + 1);
	},
	
	/** A Dice distribution has all values from 1 to `base`, with equal
	probabilities for all.
	*/
	distribution: function distribution() {
		return this.__distribution__ || (this.__distribution__ = (function (base) {
			return Iterable.range(1, base + 1).map(function (n, i) {
				return [n, 1 / base];
			}).toArray();
		})(this.base));
	}		
}); //// declare Dice.


/** ## Class Checkerboard

Base class for checkerboards representations based on several different data 
structures.
*/
var Checkerboard = utils.Checkerboard = declare({
	/** The base constructor only sets the board dimensions: `height` and 
	`width`.
	*/
	constructor: function Checkerboard(height, width) {
		if (!isNaN(height)) {
			this.height = height|0;
		}
		if (!isNaN(width)) {
			this.width = width|0;
		}
	},
	
	/** The value for empty squares is `emptySquare`. This will be used in 
	functions walking and traversing the board. 
	*/
	emptySquare: null,
	
	// ### Board information ###################################################
	
	/** All coordinates are represented by `[row, column]` arrays. To check if
	a coordinate is inside the board, use `isValidCoord(coord)`.
	*/
	isValidCoord: function isValidCoord(coord) {
		return Array.isArray(coord) && !isNaN(coord[0]) && !isNaN(coord[1])
			&& coord[0] >= 0 && coord[0] < this.height 
			&& coord[1] >= 0 && coord[1] < this.width;
	},
	
	/** Method `coordinates()` returns the sequence of the board's valid 
	positions.
	*/
	coordinates: function coordinates() {
		return Iterable.range(this.height).product(Iterable.range(this.width));
	},
	
	/** Method `square(coord, outside)` should get the contents at a given 
	coordinate. If the coordinate is off the board, `outside` must be returned.
	This method is abstract so it must be overriden in subclasses.
	*/
	square: unimplemented('utils.Checkerboard', 'square'),
	
	/** A square is assumed to be empty when its value is equal to 
	`emptySquare`.
	*/
	isEmptySquare: function isEmptySquare(coord) {
		return this.square(coord) === this.emptySquare;
	},
	
	// #### Lines ##############################################################
	
	/** Many games must deal with line configurations of pieces. The following
	methods help with this kind of logic. Each line is a sequence of coordinates
	in the board.
	+ `horizontals()`: All the horizontal lines (rows).
	*/
	horizontals: function horizontals() {
		var width = this.width;
		return Iterable.range(this.height).map(function (row) {
			return Iterable.range(width).map(function (column) {
				return [row, column];
			});
		});
	},
	
	/** 
	+ `verticals()`: All the vertical lines (columns).
	*/
	verticals: function verticals() {
		var height = this.height;
		return Iterable.range(this.width).map(function (column) {
			return Iterable.range(height).map(function (row) {
				return [row, column];
			});
		});
	},
	
	/** 
	+ `orthogonals()`: All the horizontal (rows) and vertical lines (columns) in 
		the board.
	*/
	orthogonals: function orthogonals() {
		return this.horizontals().chain(this.verticals());
	},
	
	/**
	+ `positiveDiagonals()`: All the positive diagonals lines (those where 
		row = k + column).
	*/
	positiveDiagonals: function positiveDiagonals() {
		var width = this.width, 
			height = this.height, 
			count = height + width - 1;
		return Iterable.range(count).map(function (i) {
			var row = Math.max(0, height - i - 1),
				column = Math.max(0, i - height + 1);
			return Iterable.range(Math.min(i + 1, count - i)).map(function (j) {
				return [row + j, column + j];
			});
		});
	},
	
	/** 
	+ `negativeDiagonals()`: All the negative diagonals lines (those where 
		row = k - column).
	*/
	negativeDiagonals: function negativeDiagonals() {
		var width = this.width, 
			height = this.height, 
			count = height + width - 1;
		return Iterable.range(count).map(function (i) {
			var row = Math.min(i, height - 1),
				column = Math.max(0, i - height + 1);
			return Iterable.range(Math.min(i + 1, count - i)).map(function (j) {
				return [row - j, column + j];
			});
		});
	},
	
	/**
	+ `diagonals()`: All the diagonal lines in the board.
	*/
	diagonals: function diagonals() {
		return this.positiveDiagonals().chain(this.negativeDiagonals());
	},
	
	/**
	+ `lines()`: All the horizontal, vertical and diagonal lines in the board.
	*/
	lines: function lines() {
		return this.orthogonals().chain(this.diagonals());
	},
	
	/** The previous methods return the whole lines. Some times the game logic 
	demands checking lines of a certain length. These are sublines, and can be
	calculated by `sublines(lines, length)`. It obviously filters lines which
	are shorter than length.
	*/
	sublines: function sublines(lines, length) {
		return iterable(lines).map(function (line) {
			return Array.isArray(line) ? line : iterable(line).toArray();
		}, function (line) {
			return line.length >= length;
		}).map(function (line) {
			return Iterable.range(0, line.length - length + 1).map(function (i) {
				return line.slice(i, i + length);
			});
		}).flatten();
	},
	
	// #### Walks ##############################################################
	
	/** A walk is a sequence of coordinates in the board that start at a given
	point and advances in a certain direction. The `walk(coord, delta)` method
	returns an iterable with coordinates from `coord` and on, adding `delta`'s 
	row and column until going off the board.
	*/
	walk: function walk(coord, delta) {
		var board = this;
		return new Iterable(function __iter__() {
			var current = coord.slice();
			return function __walkIterator__() {
				if (board.isValidCoord(current)) {
					var result = current.slice();
					current[0] += delta[0];
					current[1] += delta[1];
					return result;
				} else {
					throw Iterable.STOP_ITERATION;
				}
			};
		});
	},
	
	/** Convenient method `walks(coord, deltas)` can be used to get many walks
	from the same origin.
	*/
	walks: function walks(coord, deltas) {
		var board = this;
		return deltas.map(function (delta) {
			return board.walk(coord, delta);
		});
	},
	
	/** Frequently used deltas for walks are available at `DIRECTIONS`.
	*/
	"static DIRECTIONS": {
		HORIZONTAL: [[0,-1], [0,+1]],
		VERTICAL:   [[-1,0], [+1,0]], 
		ORTHOGONAL: [[0,-1], [0,+1], [-1,0], [+1,0]],
		DIAGONAL:   [[-1,-1], [-1,+1], [+1,-1], [+1,+1]],
		EVERY:      [[0,-1], [0,+1], [-1,0], [+1,0], [-1,-1], [-1,+1], [+1,-1], [+1,+1]]
	},
	
	// ### Board modification ##################################################
	/** Game states must not be modifiable, else game search algorithms may fail
	or be extremely complicated. Then, all board altering method in 
	`Checkerboard` must return a new board instance and leave this instance 
	unspoiled.
	
	Most board modification functions have two versions: one which actually
	modifies the board state and another which returns a modified copy. This is
	meant to optimize chains of board alterations. To get a copy of this board, 
	the `clone` method can be used.
	*/
	clone: unimplemented('utils.Checkerboard', 'clone'),
	
	/** The first function to change the board is `place(coord, value)`. It 
	places the value at the given coordinate, replacing whatever was there.
	
	The `__place__` version modifies this board, and is not implemented in the 
	base class. It should return this instance, to enable chaining.
	*/
	__place__: unimplemented('utils.Checkerboard', 'place'),
	
	place: function place(coord, value) {
		return this.clone().__place__(coord, value);
	},

	/** Another usual operation is `move(coordFrom, coordTo, valueLeft)`.
	It moves the contents at `coordFrom` to `coordTo`. Whatever is at `coordTo`
	gets replaced, and `valueLeft` is placed at `coordFrom`. If `valueLeft` is 
	undefined, `emptySquare` is used.
	*/
	__move__: function __move__(coordFrom, coordTo, valueLeft) {
		return this.__place__(coordTo, this.square(coordFrom))
			.__place__(coordFrom, typeof valueLeft === 'undefined' ? this.emptySquare : valueLeft);
	},
	
	move: function move(coordFrom, coordTo, valueLeft) {
		return this.clone().__move__(coordFrom, coordTo, valueLeft);
	},
	
	/** The next board operation is `swap(coordFrom, coordTo)`, which moves the 
	contents at `coordFrom` to `coordTo`, and viceversa.
	*/
	__swap__: function __swap__(coordFrom, coordTo) {
		var valueTo = this.square(coordTo);
		return this.__place__(coordTo, this.square(coordFrom))
			.__place__(coordFrom, valueTo);
	},
	
	swap: function swap(coordFrom, coordTo) {
		return this.clone().__swap__(coordFrom, coordTo);
	},
	
	// ## Board presentation. ##################################################
	
	/** Board games' user interfaces may be implemented using HTML & CSS. This
	is the case of Ludorum's playtesters.
	TODO.
	*/
	asHTMLTable: function (document, parent, callback) { //TODO
		var table = document.createElement('table');
		board.horizontals().reverse().foeEach(function (line) {
			var tr = document.createElement('tr');
			table.appendChild(tr);
			line.forEach(function (coord) {
				var square = board.square(coord),
					data = callback(square, coord),
					td = document.createElement('td');
					td_content = document.createTextNode(data.hasOwnProperty('content') ? data.content : square);
				tr.appendChild(td);
				td.id = data.id || "ludorum-square-"+ coord.join('-');
				td.className = data.className || "ludorum-square";
				td.data_ludorum = data;
			});
		});
	}	
}); //// declare utils.Checkerboard.


/** ## Class CheckerboardFromString

[`Checkerboard`](Checkerboard.html) implementation represented by a simple 
string (one character per square).
*/
var CheckerboardFromString = utils.CheckerboardFromString = declare(Checkerboard, {
	/** The constructor takes `height`, `width`, the whole board content in a 
	`string`, and optionally the empty square character.
	*/
	constructor: function CheckerboardFromString(height, width, string, emptySquare) {
		Checkerboard.call(this, height, width);
		if (emptySquare) {
			this.emptySquare = (emptySquare + this.emptySquare).charAt(0);
		}
		if (string && string.length !== height * width) {
			throw new Error('Given string '+ JSON.stringify(string) +' does not match board dimensions.');
		}
		this.string = string || this.emptySquare.repeat(height * width);
	},
	
	/** The `emptySquare` in `CheckerboardFromString` is `'.'` by default.
	*/
	emptySquare: '.',	
	
	/** The default string conversion of `CheckerboardFromString` prints the 
	board one line by row, last row on top.
	*/
	toString: function toString() {
		var string = this.string, height = this.height, width = this.width;
		return Iterable.range(height).map(function (i) {
			return string.substr((height - i - 1) * width, width);
		}).join('\n');
	},
	
	// ### Board information ###################################################
	/** The `square(coord, outside)` return the character at `(row * width + 
	column)` if the coordinate is inside the board. Else returns `outside`.
	*/
	square: function square(coord, outside) {
		var row = coord[0], 
			column = coord[1],
			width = this.width;
		if (row >= 0 && row < this.height && column >= 0 && column < width) {
			return this.string.charAt(row * width + column);
		} else {
			return outside;
		}
	},
	
	// #### Lines ##############################################################
	/** Since square contents in `CheckerboardFromString` are just characters,
	lines can be thought as strings. The method `asString(line)` takes an
	iterable of coordinates and returns a string of the characters found at each
	point in the sequence.
	*/
	asString: function asString(line) {
		var board = this;
		return line.map(function (coord) {
			return board.square(coord);
		}).join('');
	},
	
	/** The method `asStrings(lines)` can be used to easily map `asString(line)`
	to a sequence of lines, like the one calculated by `lines()`.
	*/
	asStrings: function asStrings(lines) {
		var board = this;
		return lines.map(function (line) {
			return board.asString(line);
		});
	},
	
	/** Many games based on board configurations (like connection games) have 
	patterns that can be expressed with regular expressions. The method 
	`asRegExp(line, insideLine, outsideLine)` takes a line (iterable of 
	coordinates) and returns a string with a regular expression. This may be 
	used to tests the whole board string for the line.
	
	_Warning!_ Both `insideLine` and `outsideLine` must be simple regular 
	expressions (e.g. a character or atom). If more complex expressions are
	required they must be provided between parenthesis.
	*/
	asRegExp: function asRegExp(line, insideLine, outsideLine) {
		outsideLine = outsideLine || '.';
		var width = this.width,
			squares = Iterable.repeat(false, width * this.height).toArray();
		line.forEach(function (coord) {
			squares[coord[0] * width + coord[1]] = true;
		});
		var result = '', count = 0, current;
		for (var i = 0; i < squares.length; count = 0) {
			current = squares[i];
			do {
				++count;
			} while (++i < squares.length && squares[i] === current);
			if (count < 2) {
				result += current ? insideLine : outsideLine;
			} else {
				result += (current ? insideLine : outsideLine) +'{'+ count +'}';
			}
		}
		return result;
	},
	
	/** The method `asRegExps(lines)` can be used to easily map `asRegExp(line)`
	to a sequence of lines. All regular expressions are joined as a union (`|`).
	Use with caution, because the whole regular expression can get very big even
	with small boards.
	*/
	asRegExps: function asRegExps(lines, insideLine, outsideLine) {
		var board = this;
		return lines.map(function (line) {
			return board.asRegExp(line, insideLine, outsideLine);
		}).join('|');
	},
	
	// ### Board modification ##################################################
	
	/** Cloning a CheckerboardFromString simply calls the constructor again
	with the proper arguments to replicate this instance.
	*/
	clone: function clone() {
		return new this.constructor(this.height, this.width, this.string, 
			this.hasOwnProperty('emptySquare') ? this.emptySquare : undefined);
	},
	
	/** A `place(coord, value)` means only changing one character in the
	underlying string. The `value` must be a character, and `coord` a point
	inside the board.
	*/
	__place__: function __place__(coord, value) {
		raiseIf(!this.isValidCoord(coord), "Invalid coordinate ", coord, ".");
		value = (value + this.emptySquare).charAt(0);
		var i = coord[0] * this.width + coord[1];
		this.string = this.string.substr(0, i) + value + this.string.substr(i + 1);
		return this;
	}	
}); // declare utils.CheckerboardFromString


/** Component for scanning a game's tree.
*/
exports.utils.Scanner = declare({
	/** new utils.Scanner(config):
		A Scanner builds a sample of a game tree, in order to get statistics 
		from some of all possible matches.
	*/
	constructor: function Scanner(config) {
		initialize(this, config)
		/** utils.Scanner.game:
			Game to scan.
		*/
			.object("game", { ignore: true })
		/** utils.Scanner.maxWidth=1000:
			Maximum amount of game states held at each step.
		*/
			.integer("maxWidth", { defaultValue: 1000, coerce: true })
		/** utils.Scanner.maxLength=50:
			Maximum length of simulated matches.
		*/
			.integer("maxLength", { defaultValue: 50, coerce: true })
		/** utils.Scanner.random=randomness.DEFAULT:
			Pseudorandom number generator to use in the simulations.
		*/			
			.object("random", { defaultValue: Randomness.DEFAULT })
		/** utils.Scanner.statistics:
			Component to gather relevant statistics. These include:
			* `game.result`: Final game state results. Also available for victory and defeat.
			* `game.length`: Match length in plies. Also available for victory and defeat.
			* `game.width`: Number of available moves.
			* `draw.length`: Drawn match length in plies.
		*/
			.object("statistics", { defaultValue: new Statistics() });
	},
	
	/** utils.Scanner.scan(players, games...=[this.game]):
		Scans the trees of the given game (using this scanner's game by 
		default). This means reproducing and sampling the set of all possible 
		matches from the given game states. The simulation halts at maxLength
		plies, and never holds more than maxWidth game states.
		The players argument may provide a player for some or all of the games'
		roles. If available, they will be used to decide which move is applied
		to each game state. If missing, all next game states will be added. Ergo
		no players means a simulation off all possible matches.		
	*/
	scan: function scan(players) {
		var scanner = this,
			window = arguments.length < 2 ? (this.game ? [this.game] : []) : Array.prototype.slice.call(arguments, 1),
			ply = 0; 
		return Future.whileDo(function () {
			return window.length > 0 && ply < scanner.maxLength;
		}, function () {
			return Future.all(window.map(function (game) {
				return scanner.__advance__(players, game, ply);
			})).then(function (level) {
				window = iterable(level).flatten().sample(scanner.maxWidth, scanner.random).toArray();
				return ++ply;
			});
		}).then(function () {
			scanner.statistics.add({ key:'aborted' }, window.length);
			return scanner.statistics;
		});
	},
	
	scans: function scans() {
		return Future.sequence(Array.prototype.slice.call(arguments), this.scan.bind(this));
	},
	
	/** utils.Scanner.__advance__(players, game, ply):
		Advances the given game by one ply. This may mean for non final game 
		states either instantiate random variables, ask the available player 
		for a decision, or take all next game states. Final game states are 
		removed. All game states are accounted in the scanner's statistics. The
		result is an Iterable with the game states to add to the next scan
		window.
	*/
	__advance__: function __advance__(players, game, ply) {
		if (game instanceof Aleatory) {
			return iterable(game.distribution()).mapApply(function (value, prob) {
				return game.next(value);
			});
		} else if (this.account(players, game, ply)) {
			return Iterable.EMPTY;
		} else {
			var scanner = this,
				moves = game.moves(),
				stats = this.statistics;
			return Future.all(game.activePlayers.map(function (role) {
				if (players && players[role]) {
					var p = players[role],
						decisionTime = stats.stat({key:'decision.time', game: game.name, role: role, player: p.name});
					decisionTime.startTime();
					return Future.when(p.decision(game, role)).then(function (move) {
						decisionTime.addTime();
						return [[role, move]];
					});
				} else {
					return moves[role].map(function (move) {
						return [role, move];
					});
				}
			})).then(function (decisions) {
				return Iterable.product.apply(this, decisions).map(function (moves) {
					return game.next(iterable(moves).toObject());
				});
			});
		}
	},
			
	/** utils.Scanner.account(players, game, ply):
		Gathers statistics about the game. Returns whether the given game state
		is final or not.
	*/
	account: function account(players, game, ply) {
		var result = game.result(),
			stats = this.statistics;
		if (result) {
			iterable(game.players).forEach(function (role) {
				var r = result[role],
					p = (players && players[role]) ? players[role].name : '',
					keys = ['game:'+ game.name, 'role:'+ role, 'player:'+ p];
				stats.add({key:'game.result', game:game.name, role:role, player:p}, r, game);
				stats.add({key:'game.length', game:game.name, role:role, player:p}, ply, game);
				if (r < 0) {
					stats.add({key:'defeat.result', game:game.name, role:role, player:p}, r, game);
					stats.add({key:'defeat.length', game:game.name, role:role, player:p}, ply, game);
				} else if (r > 0) {
					stats.add({key:'victory.result', game:game.name, role:role, player:p}, r, game);
					stats.add({key:'victory.length', game:game.name, role:role, player:p}, ply, game);
				} else {
					stats.add({key:'draw.length', game:game.name, role:role, player:p}, ply, game);
				}
			});
			return true;
		} else {
			var moves = game.moves();
			iterable(game.activePlayers).forEach(function (role) {
				stats.add({key:'game.width', game:game.name, role:role}, moves[role].length);
			});
			return false;
		}
	}
}); // declare utils.Scanner.


/** ## Class Cache.

A game cache contains a part of a game tree, avoiding redundancies. It can be
used to implement a [transposition table](http://en.wikipedia.org/wiki/Transposition_table) 
or similar data structures.
*/
utils.Cache = declare({
	/** The Cache constructor may take a game to define as `root`.
	*/
	constructor: function Cache(game) {
		this.clear();
		game && this.root(game);
	},
	
	/** The `stateIdentifier(state)` of every game state is used as the key in 
	the cache's entries. By default is calculated with the `Game.identifier()`
	method.
	*/
	stateIdentifier: function stateIdentifier(state) {
		return state.identifier();
	},
	
	/**
	*/
	moveIdentifier: function moveIdentifier(move) {
		return JSON.stringify(move);
	},
	
	/** The `has(state|id)` returns if the given state or state identifier has 
	an entry in this cache.
	*/
	has: function has(state) {
		var stateId = typeof state === 'string' ? state : this.stateIdentifier(state);
		return this.__entries__.hasOwnProperty(stateId);
	},
	
	/** If the given state or state identifier has en entry in this cache, 
	`get(state)` returns that entry. Else it returns `undefined`.
	*/
	get: function get(state) {
		var stateId = typeof state === 'string' ? state : this.stateIdentifier(state);
		return this.__entries__[stateId];
	},
	
	/** If the given state has no entry in this cache, `entry(state, id)` builds
	a new entry, adds it to this cache and returns it. If the state is already
	cached, its entry is returned.
	Every entry has the game `state`, its `id`, the states that may come before
	(the `precursors`) and the states that may follow (the `descendants`).
	*/
	entry: function entry(state, id) {
		id = id || this.stateIdentifier(state);
		if (this.has(id)) {
			return this.get(id);
		} else {
			var _entry = { id: id, state: state, precursors: [], descendants: {} };
			this.__entries__[id] = _entry;
			return _entry;
		}
	},
	
	/** An entry's `descendant(entry, moves)` is the entry of the game state 
	following the given entry's game state with the given moves. The method not
	only returns the entry is this state, it creates and caches that entry if 
	not present.
	*/
	descendant: function descendant(entry, moves) {
		var movesId = this.moveIdentifier(moves),
			descendants = entry.descendants;
		if (descendants.hasOwnProperty(movesId)) { // Already expanded.
			return descendants[movesId][1];
		} else {
			var nextState = entry.state.next(moves),
				nextStateId = this.stateIdentifier(nextState),
				nextEntry = this.get(nextStateId) // Reuse entry in cache if it exists.
					|| this.entry(nextState, nextStateId); // Else add new entry.
			descendants[movesId] = [moves, nextEntry];
			nextEntry.precursors.push([moves, entry]);
			return nextEntry;
		}
	},
	
	/** An entry `descendants(entry)`
	*/
	descendants: function descendants(entry) {
		var descendant = this.descendant.bind(this, entry);
		if (arguments.length > 1) {
			return Array.prototype.slice.call(arguments, 1).map(descendant);
		} else { // if (arguments.length == 0)
			return entry.state.possibleMoves().map(descendant);
		}
	},
	
	/** A clear cache has no entries and of course no root.
	*/
	clear: function clear() {
		this.__entries__ = {};
		this.__root__ = null;
	},
	
	/** If `root()` is called without arguments, it returns the current root.
	If a state is given, that state is assigned as the new root, and the whole
	cache is pruned.
	*/
	root: function root(state) {
		if (arguments.length > 0) { // Called with argument means setter.
			var stateId = this.stateIdentifier(state);
			this.__root__ = this.get(stateId) || this.entry(state, stateId);
			this.prune(stateId);
		}
		return this.__root__;
	},
	
	/** Deletes all nodes except the one with the given id and its descendants.
	*/
	prune: function prune(id) {
		var pending = [id || this.__root__.id], 
			pruned = {},
			entry;
		while (id = pending.shift()) {
			if (!pruned.hasOwnProperty(id)) {
				entry = this.get(id);
				pruned[id] = entry;
				pending.push.apply(pending, iterable(entry.descendants).mapApply(function (id, pair) {
					return pair[1].id;
				}).toArray());
			}
		}
		return this.__entries__ = pruned;
	}	
}); // declare Cache


/** Simple reference games with a predefined outcome, mostly for testing 
	purposes.
*/
games.Predefined = declare(Game, {
	/** new games.Predefined(activePlayer, results, height=5, width=5):
		A pseudogame used for testing purposes. It will give width amount of 
		moves for each player until height moves pass. Then the match is 
		finished with the given results, or a tie as default.
	*/
	constructor: function Predefined(activePlayer, results, height, width) {
		if (results) {
			this.__results__ = results;
			this.players = Object.keys(results);
		}
		Game.call(this, activePlayer);
		this.height = isNaN(height) ? 5 : +height;
		this.width = isNaN(width) ? 5 : +width;
	},

	name: 'Predefined',
	
	/** games.Predefined.players:
		Default players for Predefined: A and B.
	*/
	players: ['A', 'B'],

	/** games.Predefined.__results__:
		Default results for Predefined: a tie between A and B.
	*/
	__results__: {'A': 0, 'B': 0},

	/** games.Predefined.moves():
		Moves for a Predefined are numbers from 1 to this.width. 
	*/
	moves: function moves() {
		if (this.height > 0) {
			return obj(this.activePlayer(), 
				Iterable.range(1, this.width + 1).toArray()
			);
		}
	},

	/** games.Predefined.result():
		Returned the predefined results if height is zero or less.
	*/
	result: function result() {
		return this.height > 0 ? null : this.__results__;
	},

	/** games.Predefined.next(moves):
		Moves are completely irrelevant. They only advance in the match.
	*/
	next: function next() {
		return new this.constructor(this.opponent(), this.__results__, this.height - 1, this.width);
	},
	
	__serialize__: function __serialize__() {
		return [this.name, this.activePlayer(), this.results, this.height, this.width];
	}
}); // declare Predefined.


/** Simple silly game where players can instantly choose to win, loose, draw or
	just continue. Mostly for testing purposes.
*/
games.Choose2Win = declare(Game, {
	/** new games.Choose2Win(turns=Infinity, activePlayer=players[0], winner=none):
		Choose2Win is a silly game indeed. Each turn one of the players can
		decide to win, to lose or to pass the turn. It is meant to be used 
		only for testing Ludorum, since a game can hardly become less 
		interesting than this.
	*/
	constructor: function Choose2Win(turns, activePlayer, winner) {
		Game.call(this, activePlayer);
		this.__turns__ = isNaN(turns) ? Infinity : +turns;
		this.__winner__ = winner;		
	},

	name: 'Choose2Win',
	
	/** games.Choose2Win.players=['This', 'That']:
		Players of the dummy game.
	*/
	players: ['This', 'That'],

	/** games.Choose2Win.moves():
		Moves always are 'win', 'lose', 'pass'.
	*/
	moves: function moves() {
		if (!this.__winner__ && this.__turns__ > 0) {
			return obj(this.activePlayer(), ['win', 'lose', 'pass']);
		}
	},

	/** games.Choose2Win.result():
		Victory for who chooses to win. Defeat for who chooses to lose. Draw 
		only when a limit of turns (if given) is met.
	*/
	result: function result() {
		return this.__winner__ ? this.victory(this.__winner__) :
			this.__turns__ < 1 ? this.draw() : null;
	},

	/** games.Choose2Win.next(moves):
		Moves must be always 'win', 'lose' or 'pass'.
	*/
	next: function next(moves) {
		var activePlayer = this.activePlayer(),
			opponent = this.opponent(activePlayer);
		switch (moves[activePlayer]) {
			case 'win': return new this.constructor(this.__turns__ - 1, opponent, activePlayer);
			case 'lose': return new this.constructor(this.__turns__ - 1, opponent, opponent);
			case 'pass': return new this.constructor(this.__turns__ - 1, opponent);
			default: break; // So the lint would not complaint.
		}
		throw new Error('Invalid move '+ moves[activePlayer] +' for player '+ activePlayer +'.');
	},
	
	__serialize__: function __serialize__() {
		return [this.name, this.__turns__, this.activePlayer(), this.__winner__];
	}
}); // declare Choose2Win.


games.ConnectionGame = declare(Game, {
	/** games.ConnectionGame.height=9:
		Number of rows in the board.
	*/
	height: 9,
	
	/** games.ConnectionGame.width=9:
		Number of columns in the board.
	*/
	width: 9,
	
	/** games.ConnectionGame.lineLength=5:
		Length of the line required to win.
	*/
	lineLength: 5,

	/** new games.ConnectionGame(activePlayer=players[0], board=<empty board>):
		Builds a new connection game.
	*/
	constructor: function ConnectionGame(activePlayer, board) {
		Game.call(this, activePlayer);
		/** games.ConnectionGame.board:
			Instance of boards.CheckerboardFromString.
		*/
		this.board = (board instanceof CheckerboardFromString) ? board :
			new CheckerboardFromString(this.height, this.width, 
				(board || '.'.repeat(this.height * this.width)) +''
			);
	},

	name: 'ConnectionGame',
	
	/** games.ConnectionGame.players=['First', 'Second']:
		Connection game's default players.
	*/
	players: ['First', 'Second'],
	
	/* Cache of lines to accelerate the result calculation. */
	__lines__: (function () {
		var CACHE = {};
		function __lines__(height, width, lineLength) {
			var key = height +'x'+ width +'/'+ lineLength;
			if (!CACHE.hasOwnProperty(key)) {
				var board = new CheckerboardFromString(height, width, '.'.repeat(height * width));
				CACHE[key] = board.lines().map(function (line) {
					return line.toArray();
				}, function (line) {
					return line.length >= lineLength;
				}).toArray();
			}
			return CACHE[key];
		}
		__lines__.CACHE = CACHE;
		return __lines__;
	})(),
	
	/** games.ConnectionGame.result():
		A connection game ends when whether player gets the required amount of
		pieces aligned (either horizontally, vertically or diagonally), then 
		winning the game. The match ends in a tie if the board gets full.
	*/
	result: function result() {
		if (this.hasOwnProperty('__result__')) {
			return this.__result__;
		}
		var lineLength = this.lineLength,
			lines = this.board.asStrings(this.__lines__(this.height, this.width, lineLength)).join(' ');
		for (var i = 0; i < this.players.length; ++i) {
			if (lines.indexOf(i.toString(36).repeat(lineLength)) >= 0) {
				return this.__result__ = this.victory([this.players[i]]);
			}
		}
		if (lines.indexOf('.') < 0) { // No empty squares means a tie.
			return this.__result__ = this.draw();
		}
		return this.__result__ = null; // The game continues.
	},
	
	/** games.ConnectionGame.moves():
		Return the index of every empty square.
	*/
	moves: function moves() {
		if (this.hasOwnProperty('__moves__')) {
			return this.__moves__;
		} else if (this.result()) {
			return this.__moves__ = null;
		} else {
			return this.__moves__ = obj(this.activePlayer(), 
				iterable(this.board.string).filter(function (c) {
					return c === '.';
				}, function (c, i) {
					return i;
				}).toArray()
			);
		}
	},

	/** games.ConnectionGame.next(moves):
		Places a active player's piece in the given square.
	*/
	next: function next(moves) {
		var activePlayer = this.activePlayer(),
			playerIndex = this.players.indexOf(activePlayer),
			squareIndex = +moves[activePlayer],
			row = (squareIndex / this.width) >> 0,
			column = squareIndex % this.width;
		return new this.constructor((playerIndex + 1) % this.players.length, 
			this.board.place([row, column], playerIndex.toString(36))
		);
	},
	
	/** games.ConnectionGame.toHTML():
		Renders the board as a HTML table.
	*/
	toHTML: function toHTML() {
		var moves = this.moves(),
			activePlayer = this.activePlayer(),
			board = this.board,
			width = this.width;
		moves = moves && moves[activePlayer];
		return '<table>'+
			board.horizontals().reverse().map(function (line) {
				return '<tr>'+ line.map(function (coord) {
					var data = '',
						value = board.square(coord),
						move = coord[0] * width + coord[1];
					if (moves && moves.indexOf(move) >= 0) {
						data = ' data-ludorum="move: '+ move +', activePlayer: \''+ activePlayer +'\'"';
					}
					return (value === '.') ? '<td '+ data +'>&nbsp;</td>'
						: '<td class="ludorum-player'+ value +'" '+ data +'>&#x25CF;</td>';
				}).join('') +'</tr>';
			}).join('') + '</table>';
	},
	
	__serialize__: function __serialize__() {
		return [this.name, this.activePlayer(), this.board.string];
	}
}); // declare ConnectionGame.

/** Classic child game, implemented as a simple example of a simultaneous game.
*/
games.OddsAndEvens = declare(Game, {
	/** new games.OddsAndEvens(turns=1, points=<cero for both players>):
		Odds and evens is a very simple simultaneous game. Each turn both 
		players draw either a one or a two.
	*/
	constructor: function OddsAndEvens(turns, points) {
		Game.call(this, this.players); // Both players are active.
		this.turns = isNaN(turns) ? 1 : +turns;
		this.points = points || { Evens: 0, Odds: 0 };
	},

	name: 'OddsAndEvens',
	
	/** games.OddsAndEvens.players=['Evens', 'Odds']:
		Players for odds and evens.
	*/
	players: ['Evens', 'Odds'],

	/** games.OddsAndEvens.moves():
		Moves always are 1 and 2.
	*/
	moves: function moves() {
		return this.turns < 1 ? null : { Evens: [1, 2], Odds: [1, 2] };
	},

	/** games.OddsAndEvens.result():
		The winner is the player with more points.
	*/
	result: function result() {
		var pointDifference = this.points.Evens - this.points.Odds;
		return this.turns > 0 ? null : {
			Evens: +pointDifference,
			Odds: -pointDifference
		};
	},

	/** games.OddsAndEvens.next(moves):
		The player matching the parity of the moves sum earns a point.
	*/
	next: function next(moves) {
		var parity = !((moves.Evens + moves.Odds) % 2);
		return new this.constructor(this.turns - 1, {
			Evens: this.points.Evens + (parity ? 1 : 0),
			Odds: this.points.Odds + (parity ? 0 : 1)
		});
	},

	__serialize__: function __serialize__() {
		return [this.name, this.turns, this.points];
	}
}); // declare OddsAndEvens.


/** Implementation of the traditional Tic-Tac-Toe game.
*/
games.TicTacToe = declare(Game, {
	/** new games.TicTacToe(activePlayer="Xs", board='_________'):
		Constructor of TicTacToe games. The first player is always Xs.
	*/
	constructor: function TicTacToe(activePlayer, board) {
		Game.call(this, activePlayer);
		this.board = board || '_________';
	},
	
	name: 'TicTacToe',
	
	/** games.TicTacToe.players:
		There are two roles in this game: "Xs" and "Os".
	*/
	players: ['Xs', 'Os'],
	
	/** games.TicTacToe.result():
		Returns a victory if any player has three marks in line, a draw if the
		board is full, or null otherwise.
	*/
	result: (function () {
		return function result() {			
			if (this.board.match(this.WIN_X)) { // Xs wins.
				return this.victory(["Xs"]);
			} else if (this.board.match(this.WIN_O)) { // Os wins.
				return this.victory(["Os"]);
			} else if (this.board.indexOf('_') < 0) { // No empty squares means a tie.
				return this.draw();
			} else {
				return null; // The game continues.
			}
		};
	})(),
	
	/** games.TicTacToe.moves():
		Returns the indexes of empty squares in the board.
	*/
	moves: function moves() {
		if (!this.result()) {
			var result = {};
			result[this.activePlayer()] = iterable(this.board).filter(function (chr, i) {
				return chr === '_'; // Keep only empty squares.
			}, function (chr, i) {
				return i; // Grab the index.
			}).toArray();
			return result;
		} else {
			return null;
		}		
	},
	
	/** games.TicTacToe.next(moves):
		Puts the mark of the active player in the square indicated by the move. 
	*/
	next: function next(moves) {
		var activePlayer = this.activePlayer(), 
			move = +moves[activePlayer];
		if (this.board.charAt(move) !== '_') {
			throw new Error('Invalid move '+ JSON.stringify(moves) +' for board '+ this.board
					+' (moves= '+ JSON.stringify(moves) +').');
		}
		var newBoard = this.board.substring(0, move) + activePlayer.charAt(0) + this.board.substring(move + 1);
		return new this.constructor(this.opponent(activePlayer), newBoard);
	},

	/** games.TicTacToe.toString():
		Text version of the TicTacToe board.
	*/
	toString: function toString() {
		var board = this.board;
		return [
			board.substr(0,3).split('').join('|'), '-+-+-',
			board.substr(3,3).split('').join('|'), '-+-+-',
			board.substr(6,3).split('').join('|')
		].join('\n');
	},
	
	/** games.TicTacToe.toHTML():
		Renders the TicTacToe board as a HTML table.
	*/
	toHTML: function toHTML() {
		var activePlayer = this.activePlayer(),
			board = this.board.split('').map(function (chr, i) {
				if (chr === '_') {
					return '<td data-ludorum="move: '+ i +', activePlayer: \''+ activePlayer +'\'">&nbsp;</td>';
				} else {
					return '<td>'+ chr +'</td>';
				}
			});
		return '<table><tr>'+ [
				board.slice(0,3).join(''),
				board.slice(3,6).join(''),
				board.slice(6,9).join('')
			].join('</tr><tr>') +'</tr></table>';
	},
	
	__serialize__: function __serialize__() {
		return [this.name, this.activePlayer(), this.board];
	},
	
	// Heuristics and AI ///////////////////////////////////////////////////////
	
	/** static games.TicTacToe.heuristics:
		Bundle of heuristic evaluation functions for TicTacToe.
	*/
	"static heuristics": {
		/** games.TicTacToe.heuristics.heuristicFromWeights(weights):
			Builds an heuristic evaluation function from weights for each square 
			in the board. The result of the function is the weighted sum, empty 
			squares being ignored, opponent squares considered negative.
		*/
		heuristicFromWeights: function heuristicFromWeights(weights) {
			var weightSum = iterable(weights).map(Math.abs).sum();
			function __heuristic__(game, player) {
				var playerChar = player.charAt(0);
				return iterable(game.board).map(function (square, i) {
					return (square === '_' ? 0 : weights[i] * (square === playerChar ? 1 : -1));
				}).sum() / weightSum;
			}
			__heuristic__.weights = weights;
			return __heuristic__;
		}
	},
	
	'': function () { // Class initializer. ////////////////////////////////////
		// Build the regular expressions used in the victory test.
		var board3x3 = new CheckerboardFromString(3, 3, '_'.repeat(9)),
			lines = board3x3.sublines(board3x3.lines(), 3);
		this.prototype.WIN_X = new RegExp(board3x3.asRegExps(lines, 'X', '.'));
		this.prototype.WIN_O = new RegExp(board3x3.asRegExps(lines, 'O', '.'));
	}	
}); // declare TicTacToe
	
/** games.TicTacToe.heuristics.defaultHeuristic(game, player):
	Default heuristic for TicTacToe, based on weights for each square.
*/
games.TicTacToe.heuristics.defaultHeuristic = games.TicTacToe.heuristics.heuristicFromWeights([2,1,2,1,5,1,2,1,2]);


/** Implementation of the [Toads & Frogs](http://en.wikipedia.org/wiki/Toads_and_Frogs_%28game%29) 
	game.
*/
games.ToadsAndFrogs = declare(Game, {
	/** new games.ToadsAndFrogs(activePlayer="Toads", board='TTT__FFF'):
		Constructor of Toads & Frogs games. The first player is always Toads.
	*/
	constructor: function ToadsAndFrogs(activePlayer, board) {
		Game.call(this, activePlayer);
		this.board = board || ToadsAndFrogs.board();
	},
	
	/** static games.ToadsAndFrogs.board(chips=3, separation=2):
		Makes a board for Toads & Frogs. This is a single row with the given 
		number of chips for each player (toads to the left and frogs to the
		right) separated by the given number of empty spaces.
	*/
	"static board": function board(chips, separation) {
		chips = isNaN(chips) ? 3 : +chips;
		separation = isNaN(separation) ? 2 : +separation;
		return 'T'.repeat(chips) + '_'.repeat(separation) + 'F'.repeat(chips);
	},
	
	name: 'ToadsAndFrogs',
	
	/** games.ToadsAndFrogs.players:
		There are two roles in this game: "Toads" and "Frogs".
	*/
	players: ['Toads', 'Frogs'],
	
	/** games.ToadsAndFrogs.result():
		The match finishes when one player cannot move, hence losing the game.
	*/
	result: function result() {
		return this.moves() ? null : this.defeat();
	},
	
	/** games.ToadsAndFrogs.moves():
	*/
	moves: function moves() {
		var activePlayer = this.activePlayer(),
			result = {}, 
			ms = result[activePlayer] = [];
		this.board.replace(activePlayer == this.players[0] ? /TF?_/g : /_T?F/g, function (m, i) {
			ms.push(i);
			return m;
		});
		return ms.length > 0 ? result : null;
	},
	
	/** games.ToadsAndFrogs.next(moves):
	*/
	next: function next(moves) {
		var activePlayer = this.activePlayer(), 
			move = moves[activePlayer], 
			chip = activePlayer.charAt(0),
			board = this.board;
		if (board.substr(move, 2) == 'T_') {
			board = board.substring(0, move) + '_T' + board.substring(move + 2);
		} else if (board.substr(move, 2) == '_F') {
			board = board.substring(0, move) + 'F_' + board.substring(move + 2);
		} else if (board.substr(move, 3) == 'TF_') {
			board = board.substring(0, move) + '_FT' + board.substring(move + 3);
		} else if (board.substr(move, 3) == '_TF') {
			board = board.substring(0, move) + 'FT_' + board.substring(move + 3);
		} else {
			throw new Error('Invalid move ', move, ' for board <', board, '>.');
		}
		return new this.constructor(this.opponent(), board);
	},

	__serialize__: function __serialize__() {
		 return [this.name, this.activePlayer, this.board];
	}	
}); // declare ToadsAndFrogs


/** Implementation of the Kalah member of the Mancala family of games.
*/
games.Mancala = declare(Game, {
	/** new games.Mancala(activePlayer="North", board=makeBoard()):
		TODO.
	*/
	constructor: function Mancala(activePlayer, board){
		Game.call(this, activePlayer);
		this.board = board || this.makeBoard();
	},
	
	/** games.Mancala.makeBoard(seeds=4, houses=6):
		Builds a board array to use as the game state.
	*/
	makeBoard: function makeBoard(seeds, houses){
		seeds = isNaN(seeds) ? 4 : +seeds;
		houses = isNaN(houses) ? 6 : +houses;
		var result = [];
		for(var j = 0; j < 2; j++){
			for(var i = 0; i < houses; i++){
				result.push(seeds);
			}
			result.push(0);
		}
		return result;
	},
	
	name: 'Mancala',
	
	/** games.Mancala.players:
		Players of Mancala are North and South.
	*/
	players: ["North", "South"],
	
	/** games.Mancala.emptyCapture=false:
		If true, making a capture only moves the active player's seed to his
		store. The opponents seeds are not captured.
	*/
	emptyCapture: false,
	
	/** games.Mancala.countRemainingSeeds=true:
		If true, at the end of the game if a player has seeds on his houses,
		those seeds are included in his score.
	*/
	countRemainingSeeds: true,
	
	/** games.Mancala.store(player):
		Returns the index in this game's board of the player's store.
	*/
	store: function store(player){
		switch (this.players.indexOf(player)) {
			case 0: return this.board.length / 2 - 1; // Store of North.
			case 1: return this.board.length - 1; // Store of South.
			default: throw new Error("Invalid player "+ player +".");
		}
	},

	/** games.Mancala.houses(player):
		Returns an array with the indexes of the player's houses in this
		game's board.
	*/
	houses: function houses(player){
		switch (this.players.indexOf(player)) {
			case 0: return Iterable.range(0, this.board.length / 2 - 1).toArray(); // Store of North.
			case 1: return Iterable.range(this.board.length / 2, this.board.length - 1).toArray(); // Store of South.
			default: throw new Error("Invalid player "+ player +".");
		}
	},
	
	/** games.Mancala.oppositeHouse(player, i):
		Returns the index of the opposite house of i for the given player,
		or a negative if i is not a house of the given player.
	*/
	oppositeHouse: function oppositeHouse(player, i) {
		var playerHouses = this.houses(player),
			opponentHouses = this.houses(this.opponent(player)),
			index = playerHouses.indexOf(i);
		return index < 0 ? index : opponentHouses.reverse()[index];
	},
	
	/** games.Mancala.nextSquare(player, i):
		Returns the index of the square following i for the given player.
	*/
	nextSquare: function nextSquare(player, i){
		do {
			i = (i + 1) % this.board.length;
		} while (i === this.store(this.opponent(player)));
		return i;
	},
	
	/** games.Mancala.moves():
		A move for this game is an index of the square in the board.
	*/
	moves: function moves(){
		if (this.result()) {
			return null;
		} else {
			var board = this.board,
				result = {},
				activePlayer = this.activePlayer();			
			result[activePlayer] = this.houses(activePlayer).filter(function(house){
				return board[house] > 0; // The house has seeds.
			});
			return result[activePlayer].length > 0 ? result : null;
		}
	},
	
	/** games.Mancala.scores():
		The game ends when the active player cannot move. The score for
		each player is the seed count of its store and (if countRemainingSeeds
		is true) the houses on its side	of the board.
	*/
	scores: function scores() {
		var game = this,
			board = this.board,
			sides = this.players.map(function (player) {
				return iterable(game.houses(player)).map(function (h) {
					return board[h];
				}).sum();
			});
		if (sides[0] > 0 && sides[1] > 0) { // Both sides have seeds.
			return null;
		} else { // One side has no seeds.
			var _scores = {};
			this.players.forEach(function (player, i) {
				_scores[player] = board[game.store(player)] + game.countRemainingSeeds * sides[i];
			});
			return _scores;
		}
	},
	
	/** games.Mancala.result():
		The game ends when the active player cannot move. The result for
		each player is the difference between the seed count of the stores.
		If a player has seeds in his side, those are added to his count.
	*/
	result: function result() {
		var scores = this.scores(),
			players = this.players;
		return scores && this.zerosumResult(scores[players[0]] - scores[players[1]], players[0]);
	},
	
	/** games.Mancala.next(moves):
		TODO.
	*/
	next: function next(moves) {
		var activePlayer = this.activePlayer(), 
			move = +moves[activePlayer],
			newBoard = this.board.slice(0),
			seeds = newBoard[move],
			freeTurn = false,
			store, oppositeHouse;
		raiseIf(seeds < 1, "Invalid move ", move, " for game ", this);
		// Move.
		newBoard[move] = 0;
		for (; seeds > 0; seeds--) {
			move = this.nextSquare(activePlayer, move);
			newBoard[move]++;
		}
		// Free turn if last square of the move is the player's store.
		freeTurn = move == this.store(activePlayer); 
		// Capture.
		if (!freeTurn) {
			oppositeHouse = this.oppositeHouse(activePlayer, move);
			if (oppositeHouse >= 0 && newBoard[move] == 1 && newBoard[oppositeHouse] > 0) { 
				store = this.store(activePlayer);
				newBoard[store]++;
				newBoard[move] = 0;
				if (!this.emptyCapture) {
					newBoard[store] += newBoard[oppositeHouse];
					newBoard[oppositeHouse] = 0;
				}					
			}
		}
		return new this.constructor(freeTurn ? activePlayer : this.opponent(), newBoard);
	},
	
	/** games.Mancala.resultBounds():
		Result bounds are estimated with the total number of stones in the
		board. It is very unlikely to get these result though.
	*/
	resultBounds: function resultBounds() {
		var stoneCount = iterable(this.board).sum();
		return [-stoneCount,+stoneCount];
	},
	
	// Utility methods. ////////////////////////////////////////////////////
	
	__serialize__: function __serialize__() {
		return [this.name, this.activePlayer(), this.board.slice()];
	},

	identifier: function identifier() {
		return this.activePlayer().charAt(0) + this.board.map(function (n) {
			return ('00'+ n.toString(36)).substr(-2);
		}).join('');
	},

	/** games.Mancala.toString():
		Text version of the Mancala board.
	*/
	toString: function toString() {
		var game = this,
			lpad = base.Text.lpad,
			north = this.players[0],
			northHouses = this.houses(north).map(function (h) {
				return lpad(''+ game.board[h], 2, '0');
			}).reverse(),
			northStore = lpad(''+ this.board[this.store(north)], 2, '0'),
			south = this.players[1],
			southHouses = this.houses(south).map(function (h) {
				return lpad(''+ game.board[h], 2, '0');
			}),
			southStore = lpad(''+ this.board[this.store(south)], 2, '0');
		return "   "+ northHouses.join(" | ") +"   \n"+
			northStore +" ".repeat(northHouses.length * 2 + (northHouses.length - 1) * 3 + 2) + southStore +"\n"+
			"   "+ southHouses.join(" | ") +"   ";
	},
	
	/** games.Mancala.toHTML():
		Renders the Mancala board as a HTML table.
	*/
	toHTML: function toHTML() {
		var moves = this.moves(),
			north = this.players[0],
			south = this.players[1];
		function renderHouse(player, h) {
			if (!moves || !moves[player] || !moves[player].indexOf(h) < 0) { // Not a move.
				return '<td>'+ this.board[h] +'</td>';
			} else {
				return '<td data-ludorum="move:'+ h +', activePlayer: \''+ player +'\'">'+ this.board[h] +'</td>';
			}
		}
		return '<table><tr>'
			+ '<td rowspan="2">'+ this.board[this.store(north)] +'</td>'
			+ this.houses(north).map(renderHouse.bind(this, north)).reverse().join('') 
			+ '<td rowspan="2">'+ this.board[this.store(south)] +'</td>'
			+ '</tr><tr>'
			+ this.houses(south).map(renderHouse.bind(this, south)).join('') 
			+ '</tr></table>';
	},
	
// Heuristics. /////////////////////////////////////////////////////////////////

	/** static games.Mancala.heuristics:
		Bundle of heuristic evaluation functions for Mancala.
	*/
	'static heuristics': {
		/** games.Mancala.heuristics.heuristicFromWeights(weights=default weights):
			Builds an heuristic evaluation function from weights for each square 
			in the board. The result of the function is the normalized weighted 
			sum.
		*/
		heuristicFromWeights: function heuristicFromWeights(weights) {
			var weightSum = iterable(weights).map(Math.abs).sum();
			function __heuristic__(game, player) {
				var seedSum = 0, signum;
				switch (game.players.indexOf(player)) {
					case 0: signum = 1; break; // North.
					case 1: signum = -1; break; // South.
					default: throw new Error("Invalid player "+ player +".");
				}
				return iterable(game.board).map(function (seeds, i) {
					seedSum += seeds;
					return seeds * weights[i]; //TODO Normalize weights before.
				}).sum() / weightSum / seedSum * signum;
			}
			__heuristic__.weights = weights;
			return __heuristic__;
		}
	},
	
// Static initializer. /////////////////////////////////////////////////////////
	
	'': function () {
		this.makeBoard = this.prototype.makeBoard;
		/** games.Mancala.heuristics.defaultHeuristic(game, player):
			Default heuristic for Mancala, based on weights for each square.
		*/
		this.heuristics.defaultHeuristic = this.heuristics.heuristicFromWeights(
			[+1,+1,+1,+1,+1,+1,+5, 
			 -1,-1,-1,-1,-1,-1,-5]
		);
	}
}); // declare Mancala.


/* Pig is a simple dice game, used here as an example of a game with random 
	variables.
*/
games.Pig = declare(Game, {
	/** new games.Pig(activePlayer='One', goal=100, scores, rolls):
		[Pig](http://en.wikipedia.org/wiki/Pig_%28dice_game%29) is a dice 
		betting game, where the active player rolls dice until it rolls one or 
		passes its turn scoring the sum of previous rolls.
	*/
	constructor: function Pig(activePlayer, goal, scores, rolls) {
		Game.call(this, activePlayer);
		/** games.Pig.goal=100:
			Amount of points a player has to reach to win the game.
		*/
		this.goal = isNaN(goal) ? 100 : +goal;
		/** games.Pig.__scores__:
			Current players' scores.
		*/
		this.__scores__ = scores || iterable(this.players).zip([0, 0]).toObject();
		/** games.Pig.__rolls__:
			Active player's rolls.
		*/
		this.__rolls__ = rolls || [];
	},
	
	name: 'Pig',
	
	/** games.Pig.players=['One', 'Two']:
		Players for Pig.
	*/
	players: ['One', 'Two'],

	/** games.Pig.moves():
		The active player can either hold and pass the turn, or roll.
	*/
	moves: function moves() {
		if (!this.result()) {
			var activePlayer = this.activePlayer(),
				currentScore = this.__scores__[activePlayer] + iterable(this.__rolls__).sum();
			return obj(activePlayer, currentScore < this.goal ? ['roll', 'hold'] : ['hold']);
		}
	},

	/** games.Pig.result():
		Game finishes when one player reaches or passes the goal score. The 
		result for each player is the difference between its score and its
		opponent's score.
	*/
	result: function result() {
		var score0 = this.__scores__[this.players[0]],
			score1 = this.__scores__[this.players[1]];
		if (score0 >= this.goal || score1 >= this.goal) {
			var r = {};
			r[this.players[0]] = score0 - score1;
			r[this.players[1]] = -r[this.players[0]];
			return r;
		}
	},

	/** games.Pig.next(moves):
		The player matching the parity of the moves sum earns a point.
	*/
	next: function next(moves) {
		var activePlayer = this.activePlayer(),
			move = moves[activePlayer];
		if (move === 'hold') {
			var scores = copy(this.__scores__);
			scores[activePlayer] += iterable(this.__rolls__).sum();
			return new this.constructor(this.opponent(), this.goal, scores, []);
		} else if (move === 'roll') {
			var game = this;
			return new aleatories.Dice(function (value) {
				value = isNaN(value) ? this.value() : +value;
				return (value > 1) 
					? new game.constructor(activePlayer,  game.goal, game.__scores__, game.__rolls__.concat(value))
					: new game.constructor(game.opponent(), game.goal, game.__scores__, []);
			});
		} else {
			throw new Error("Invalid moves: "+ JSON.stringify(moves));
		}
	},
	
	__serialize__: function __serialize__() {
		return [this.name, this.activePlayer(), this.goal, this.__scores__, this.__rolls__];
	}
}); // declare Pig.


games.ConnectFour = declare(games.ConnectionGame, {
	/** games.ConnectFour.height=6:
		Number of rows in the ConnectFour board.
	*/
	height: 6,
	
	/** games.ConnectFour.width=7:
		Number of columns in the ConnectFour board.
	*/
	width: 7,
	
	/** games.ConnectFour.lineLength=4:
		Length of the line required to win.
	*/
	lineLength: 4,
	
	name: 'ConnectFour',
	
	/** games.ConnectFour.players=['Yellow', 'Red']:
		Connect Four's players.
	*/
	players: ['Yellow', 'Red'],
	
	/** games.ConnectFour.moves():
		Return the index of every column that has not reached the top height.
	*/
	moves: function moves() {
		var result = null;
		if (!this.result()) {
			var ms = [],
				board = this.board.string,
				offset = (this.height - 1) * this.width;
			for (var i = 0; i < board.length; ++i) {
				if (board.charAt(offset + i) === '.') {
					ms.push(i);
				}
			}
			if (ms.length > 0) {
				result = {};
				result[this.activePlayer()] = ms;
			}
		}
		return result;
	},

	/** games.ConnectFour.next(moves):
		Each ConnectFour move is a column index.
	*/
	next: function next(moves) {
		var activePlayer = this.activePlayer(),
			board = this.board.string,
			column = +moves[activePlayer],
			height = this.height,
			width = this.width;
		for (var row = 0; row < height; ++row) {
			if (board.charAt(row * width + column) === '.') {
				return new this.constructor(this.opponent(), 
					this.board.place([row, column], activePlayer === this.players[0] ? '0' : '1'));
			}
		}
		throw new Error('Invalid move '+ JSON.stringify(moves) +'!');
	},
	
	/** games.ConnectFour.toHTML():
		Renders the ConnectFour board as a HTML table.
	*/
	toHTML: function toHTML() {
		var moves = this.moves(),
			activePlayer = this.activePlayer(),
			board = this.board;
		moves = moves && moves[activePlayer];
		return '<table>'+
			'<colgroup>'+ '<col/>'.repeat(this.board.width) +'</colgroup>'+
			board.horizontals().reverse().map(function (line) {
				return '<tr>'+ line.map(function (coord) {
					var data = '',
						value = board.square(coord);
					if (moves && moves.indexOf(coord[1]) >= 0) {
						data = ' data-ludorum="move: '+ coord[1] +', activePlayer: \''+ activePlayer +'\'"';
					}
					return (value === '.') ? '<td '+ data +'>&nbsp;</td>'
						: '<td class="ludorum-player'+ value +'" '+ data +'>&#x25CF;</td>';
				}).join('') +'</tr>';
			}).join('') + '</table>';
	},
	
	__serialize__: function __serialize__() {
		return [this.name, this.activePlayer(), this.board.string];
	}
}); // declare ConnectFour.

games.Mutropas = declare(Game, {
	/** games.Mutropas.allPieces=[0, .., 8]:
		TODO.
	*/
	allPieces: Iterable.range(9).toArray(),
	
	name: 'Mutropas',
	
	players: ['Left', 'Right'],
	
	/** new games.Mutropas(args):
		TODO
	*/
	constructor: function Mutropas(args) {
		Game.call(this, this.players);
		args = args || {};
		this._pieces = args.pieces || this.dealtPieces(args.random);
		this._scores = args.scores || obj(this.players[0], 0, this.players[1], 0);
	},
	
	result: function result() {
		var player0 = this.players[0];
		if (this._pieces[player0].length < 1) {
			return copy({}, this._scores);
		} else {
			return null;
		}
	},
	
	moves: function moves() {
		var player0 = this.players[0],
			player1 = this.players[1];
		if (!this.result()) {
			return obj(
				player0, this._pieces[player0].slice(), 
				player1, this._pieces[player1].slice()
			);
		} else {
			return null;
		}
	},	
	
	next: function next(moves) {
		var player0 = this.players[0],
			player1 = this.players[1],
			move0 = moves[player0],
			move1 = moves[player1];
		raiseIf(this._pieces[player0].indexOf(move0) < 0, 
			"Invalid move "+ JSON.stringify(move0) +" for player "+ player0 +"! (moves= "+ JSON.stringify(moves) +")");
		raiseIf(this._pieces[player1].indexOf(move1) < 0, 
			"Invalid move "+ JSON.stringify(move1) +" for player "+ player1 +"! (moves= "+ JSON.stringify(moves) +")");
		var moveResult = this.moveResult(move0, move1),
			newPieces0 = this._pieces[player0].slice(),
			newPieces1 = this._pieces[player1].slice();
		newPieces0.splice(newPieces0.indexOf(move0), 1);
		newPieces1.splice(newPieces1.indexOf(move1), 1);
		return new this.constructor({ 
			pieces: obj(player0, newPieces0, player1, newPieces1),
			scores: obj(
				player0, this._scores[player0] + moveResult,
				player1, this._scores[player1] - moveResult
			)
		});
	},
	
	__serialize__: function __serialize__() {
		return [this.name, { pieces: this._pieces, scores: this._scores }];
	},
	
	dealtPieces: function dealtPieces(random) {
		var random = random || Randomness.DEFAULT,
			piecesPerPlayer = this.allPieces.length >> 1,
			split1 = random.split(piecesPerPlayer, this.allPieces),
			split2 = random.split(piecesPerPlayer, split1[1]);
		return obj(this.players[0], split1[0], this.players[1], split2[0]);
	},
	
	moveResult: function moveResult(piece1, piece2) {
		var upperBound = iterable(this.allPieces).max(0) + 1;
		if (piece1 < piece2) {
			return piece2 - piece1 <= (upperBound >> 1) ? 1 : -1;
		} else if (piece1 > piece2) {
			return piece1 - piece2 >= (upperBound >> 1) + 1 ? 1 : -1;
		} else {
			return 0;
		}
	}
}); // declare Mutropas

/** Implementation of Othello.
*/
games.Othello = declare(Game, {
	/** new games.Othello(activePlayer="Black", board):
		TODO.
	*/
	constructor: function Othello(activePlayer, board){
		Game.call(this, activePlayer);
		this.board = this.makeBoard.apply(this, board || []);
		if (!this.moves()) {
			var opponent = this.opponent();
			if (this.moves(opponent)) {
				this.activePlayers = [opponent];
			}
		}
	},
	
	/** games.Othello.makeBoard(rows, columns, string):
		Builds a board array to use as the game state.
	*/
	makeBoard: function makeBoard(rows, columns, string){
		rows = isNaN(rows) ? 8 : +rows;
		columns = isNaN(columns) ? 8 : +columns;
		raiseIf(rows < 4 || columns < 4 || rows % 2 || columns % 2,
			"An Othello board must have even dimensions greater than 3.")
		if (typeof string === 'string') {
			return new CheckerboardFromString(rows, columns, string);
		} else {
			return new CheckerboardFromString(rows, columns)
				.__place__([rows / 2, columns / 2 - 1], "W")
				.__place__([rows / 2 - 1, columns / 2], "W")
				.__place__([rows / 2, columns / 2], "B")
				.__place__([rows / 2 - 1, columns / 2 - 1], "B");
		}
	},
	
	name: 'Othello',
	
	/** games.Othello.players:
		Players of Othello are Black and White.
	*/
	players: ["Black", "White"],
	
	/** games.Othello.lines:
		Lines of Othello.
		//TODO: comentario en serio
		//???
	 */
	lines: new utils.Checkerboard(8, 8).lines().map(function(line){ //Deberia ser board.w y board.h en vez de 8, 8?
		return line.toArray();
	}, function(line){
		return line.length > 2;
	}).toArray(),
	
	__MOVE_REGEXPS__: {
		"Black": [/\.W+B/g, /BW+\./g],
		"White": [/\.B+W/g, /WB+\./g]
	},
	
	/** games.Othello.moves():
		A move for this game is an index of the square in the board.
	*/
	moves: function moves(player){
		if (!player && this.__moves__) {
			return this.__moves__;
		}
		player = player || this.activePlayer();
		var board = this.board,
			coords = {},
			regexps = this.__MOVE_REGEXPS__[player];
		this.lines.forEach(function(line){
			regexps.forEach(function (regexp) {
				board.asString(line).replace(regexp, function(m, i){
					var coord = m.charAt(0) === "." ? line[i] : line[m.length - 1 + i];
					coords[coord] = coord;
					return m;
				});
			});
		});
		var _moves = [];
		for (var id in coords) {
			_moves.push(coords[id]);
		}
		return this.__moves__ = (_moves.length > 0 ? obj(player, _moves) : null);
	},
	
	/** games.Othello.result():
		TODO comment
	*/
	result: function result() {
		if (this.moves()) {
			return null;
		} else {
			var weight = {"W": -1, "B": 1},
				res_b = iterable(this.board.string).map(function(m){
					return weight[m] || 0;
				}).sum();
			return this.zerosumResult(res_b, "Black");
		}
	},
	
	/** games.Othello.next(moves):
		TODO.
	*/
	next: function next(moves) {
		var board = this.board.clone(),
			activePlayer = this.activePlayer(),
			piece, valid;
		if (!moves.hasOwnProperty(activePlayer) || !board.isValidCoord(moves[activePlayer])) {
			throw new Error("Invalid moves "+ JSON.stringify(moves) +"!");
		} else if (activePlayer == this.players[0]) {
			piece = "B";
			valid = /^W+B/;
		} else {
			piece = "W";
			valid = /^B+W/;
		}
		board.walks(moves[activePlayer], Checkerboard.DIRECTIONS.EVERY).forEach(function (walk){
			var match = valid.exec(board.asString(walk).substr(1));
			if (match){
				walk.toArray().slice(0, match[0].length).forEach(function(coord){
					board.__place__(coord, piece);
				});
			}
		});
		return new this.constructor(this.opponent(), [board.height, board.width, board.string]);
	},
	
	// Utility methods. ////////////////////////////////////////////////////
	
	__serialize__: function __serialize__() {
		var board = this.board;
		return [this.name, this.activePlayer(), [board.height, board.width, board.string]];
	},
	
	/** games.ConnectionGame.toHTML():
		Renders the board as a HTML table.
	*/
	toHTML: function toHTML() {
		var moves = this.moves(),
			activePlayer = this.activePlayer(),
			board = this.board;
		moves = moves && moves[activePlayer].map(JSON.stringify);
		return '<table>'+
			board.horizontals().reverse().map(function (line) {
				return '<tr>'+ line.map(function (coord) {
					switch (board.square(coord)) {
						case 'B': return '<td class="ludorum-square-Black">&nbsp;</td>';
						case 'W': return '<td class="ludorum-square-White">&nbsp;</td>'; // &#x25CF;
						default: {
							var move = JSON.stringify(coord);
							if (moves && moves.indexOf(move) >= 0) {
								return '<td class="ludorum-square-move" data-ludorum="move: '+ 
									move +', activePlayer: \''+ activePlayer +'\'">&nbsp;</td>'; //&#x2022;
							} else {
								return '<td class="ludorum-square-empty">&nbsp;</td>';
							}
						}
					}
				}).join('') +'</tr>';
			}).join('') + '</table>';
	}
}); // declare Othello.
	
games.Othello.makeBoard = games.Othello.prototype.makeBoard;

// Heuristics //////////////////////////////////////////////////////////////////

/** static games.Othello.heuristics:
	Bundle of heuristic evaluation functions for Gomoku.
*/
games.Othello.heuristics = {};


/** Bahab is a chess-like board game originally designed for Ludorum.
*/
games.Bahab = declare(Game, {
	initialBoard: ['BBABB', 'BBBBB', '.....', 'bbbbb', 'bbabb'].join(''),

	name: 'Bahab',
	
	players: ['Uppercase', 'Lowercase'],
	
	constructor: function Bahab(activePlayer, board) {
		Game.call(this, activePlayer);
		this.board = board instanceof CheckerboardFromString ? board
			: new CheckerboardFromString(5, 5, board || this.initialBoard);
	},
	
	__PLAYER_PIECES_RE__: { Uppercase: /[AB]/g, Lowercase: /[ab]/g },
	
	result: function result() {
		var board = this.board.string;
		if (board.match(/^[.bAB]+$|[A].{0,4}$/)) { 
			//// Lowercase has no piece 'a' or Uppercase has a piece in Lowercase's rank.
			return this.defeat(this.players[1]);
		} else if (board.match(/^[.Bab]+$|^.{0,4}[a]/)) {
			//// Uppercase has no piece 'A' or Lowercase has a piece in Uppercase's rank.
			return this.defeat(this.players[0]);
		} else {
			return null;
		}
	},
	
	moves: function moves() {
		var activePlayer = this.activePlayer(),
			pieceRegExp = this.__PLAYER_PIECES_RE__[activePlayer],
			board = this.board,
			_moves = [];
		board.string.replace(pieceRegExp, function (piece, i) {
			var coord = [(i / 5)|0, i % 5], pieceMoves;
			switch (piece) {
				case 'A': pieceMoves = [[+1,-1], [+1, 0], [+1,+1]]; break;
				case 'B': pieceMoves = [[+1,-1], [+1,+1]]; break;
				case 'a': pieceMoves = [[-1,-1], [-1, 0], [-1,+1]]; break;
				case 'b': pieceMoves = [[-1,-1], [-1,+1]]; break;
			}
			iterable(pieceMoves).forEachApply(function (dx, dy) {
				var coordTo = [coord[0] + dx, coord[1] + dy],
					squareTo = board.square(coordTo);
				if (board.isValidCoord(coordTo) 
						&& !squareTo.match(pieceRegExp)
						&& (piece.toLowerCase() != 'b' || squareTo.toLowerCase() != 'a')) {
					//// Valid coordinate and not occupied by a friendly piece.
					_moves.push([coord, coordTo]);
				}
			});
			return piece;
		});
		return _moves.length > 0 ? obj(activePlayer, _moves) : null;
	},
	
	next: function next(moves) {
		if (!moves) {
			throw new Error("Invalid moves "+ moves +"!");
		}
		var activePlayer = this.activePlayer(),
			move = moves[activePlayer];
		if (!Array.isArray(moves[activePlayer])) {
			throw new Error("Invalid moves "+ JSON.stringify(moves) +"!");
		}
		return new this.constructor(this.opponent(), this.board.move(move[0], move[1]));
	},
	
	__serialize__: function __serialize__() {
		return [this.name, this.activePlayer(), this.board.string];
	},
	
	toHTML: function toHTML() {
		var moves = this.moves(),
			activePlayer = this.activePlayer(),
			board = this.board;
		return '<table>'+
			board.horizontals().reverse().map(function (line) {
				return '<tr>'+ line.map(function (coord) {
					var square = board.square(coord);
					switch (square) {
						case 'A':
						case 'B':
							return '<td class="ludorum-square-Uppercase">'+ square +'</td>';
						case 'a':
						case 'b':
							return '<td class="ludorum-square-Lowercase">'+ square +'</td>';
						default: { //TODO Agregar movimientos.
							return '<td class="ludorum-square-empty">&nbsp;</td>';
						}
					}
				}).join('') +'</tr>';
			}).join('') + '</table>';
	}
}); //// declare Bahab.

/** # Class `RoundRobin`

[Round-robins](http://en.wikipedia.org/wiki/Round-robin_tournament) are 
tournaments where all players play against each other a certain number of times.
*/
tournaments.RoundRobin = declare(Tournament, {
	/** The constructor takes the `game` to be played, the `players` and the 
	amount of matches each player should play (`matchCount`).
	*/
	constructor: function RoundRobin(game, players, matchCount) {
		Tournament.call(this, game, players);
		this.matchCount = isNaN(matchCount) ? game.players.length : +matchCount;
		this.__advance__ = this.__matches__().chain(Iterable.repeat(null)).__iter__();
	},

	/** Round-robin matches make every player plays `matchCount` matches for 
	each role in the game against all the other opponents.
	*/
	__matches__: function __matches__() {
		var tournament = this,
			game = this.game,
			ms = iterable(this.players);
		ms = ms.product.apply(ms, Iterable.repeat(this.players, game.players.length - 1).toArray());
		return ms.filter(function (tuple) { // Check for repeated.
			for (var i = 1; i < tuple.length; i++) {
				for (var j = 0; j < i; j++) {
					if (tuple[i] === tuple[j]) {
						return false;
					}
				}
			}
			return true;
		}).product(Iterable.range(this.matchCount)).map(function (tuple) {
			return new Match(game, tuple[0]);
		});
	}
}); //// declare RoundRobin.


/** ## Class `Measurement`

Measurement tournaments pit the player being measured against others in order
to assess that player's performance at a game. They are used to evaluate how 
well the players play by confronting them with the opponents, rotating their 
roles in the matches.
*/
tournaments.Measurement = declare(Tournament, {
	/** The constructor takes the `game` used in the contest, the `players`
	being evaluated, the `opponents` used to evaluate them, and the amount of
	matches each player will play (`matchCount`).
	*/
	constructor: function Measurement(game, players, opponents, matchCount) {
		Tournament.call(this, game, Array.isArray(players) ? players : [players]);
		this.opponents = Array.isArray(opponents) ? opponents : [opponents];
		raiseIf(this.opponents.length < game.players.length - 1, "Not enough opponents.");
		this.matchCount = isNaN(matchCount) ? game.players.length : +matchCount;
		this.__advance__ = this.__matches__().chain(Iterable.repeat(null)).__iter__();
	},

	/** A measurement tournament makes every player play `matchCount` matches 
	for each role in the game against all possible combinations of opponents.
	*/
	__matches__: function __matches__() {
		var game = this.game,
			playerCount = game.players.length,
			opponentCombinations = iterable(this.opponents);
		if (playerCount > 2) {
			opponentCombinations = opponentCombinations.product.apply(opponentCombinations, 
				Iterable.repeat(this.opponents, playerCount - 2).toArray());
		} else {
			opponentCombinations = opponentCombinations.map(function (p) {
				return [p];
			});
		}
		return iterable(this.players).product( 
			Iterable.range(playerCount),
			opponentCombinations,
			Iterable.range(this.matchCount)).map(function (tuple){
				var players = tuple[2].slice(0);
				players.splice(tuple[1], 0, tuple[0]);
				return new Match(game, players);
			});
	}
}); //// declare Measurement.


/** # Class `Elimination`

Playoffs or sudden death kind of contests, also known as 
[elimination tournaments](http://en.wikipedia.org/wiki/Single-elimination_tournament).
In this tournaments players get randomly matched in successive brackets, each 
match's winner passing to the next round until the final match. Games are 
assumed to have only one winner per match.
*/
tournaments.Elimination = declare(Tournament, {
	/** The constructor takes the `game` to be played, the `players` and the 
	amount of matches that make each playoff (`matchCount`, 1 by default).
	*/
	constructor: function Elimination(game, players, matchCount) {
		Tournament.call(this, game, players);
		this.matchCount = isNaN(matchCount) ? 1 : +matchCount >> 0;
	},

	/** Each bracket is defined by partitioning the `players` in groups of the
	size required by the game (usually two). If there are not enough players,
	some players get reassigned. The bracket includes `matchCount` matches 
	between these participants, rotating roles if possible.
	*/
	__bracket__: function __bracket__(players) {
		var game = this.game,
			matchCount = this.matchCount,
			roleCount = this.game.players.length;
		players = players || this.players;
		if (players.length < roleCount) {
			return [];
		} else {
			return Iterable.range(0, players.length, roleCount).map(function (i) {
				var participants = Iterable.range(i, i + roleCount).map(function (j) {
					return players[j % players.length]; // Fill by repeating players if necessary.
				}).toArray();
				return Iterable.range(matchCount).map(function (i) {
					participants.unshift(participants.pop()); // Rotate partipants roles.
					return new Match(game, participants);
				}).toArray();
			}).toArray();
		}
	},
	
	/** A playoff is resolved by aggregating the results of all its matches. The
	winner of the playoff is the one with the greater result sum.
	*/
	__playoff__: function __playoff__(matches) {
		var playoffResult = {},
			players = {};
		matches.forEach(function (match) {
			var matchResult = match.result();
			if (!matchResult) {
				throw new Error('Unfinished match in playoff!');
			}
			iterable(match.players).forEach(function (tuple) {
				var role = tuple[0],
					playerName = tuple[1].name;
				playoffResult[playerName] = (+playoffResult[playerName] || 0) + matchResult[role];
				players[playerName] = tuple[1];
			})
		});
		var winnerName = iterable(playoffResult).greater(function (pair) {
			return pair[1];
		})[0][0];
		return players[winnerName];
	},
	
	/** The elimination tournament runs until there is less players in the next
	bracket than the amount required to play the game. Since this amount is 
	usually two, the contest ends with one player at the top.
	*/
	__advance__: function __advance__() {
		if (!this.__matches__ || this.__matches__.length < 1) {
			if (!this.__currentBracket__) { // First bracket.
				this.__currentBracket__ = this.__bracket__(this.players);
			} else if (this.__currentBracket__.length < 1) { // Tournament is finished.
				return null;
			} else { // Second and on brackets.
				var players = this.__currentBracket__.map(this.__playoff__);
				this.__currentBracket__ = this.__bracket__(players);
			}
			this.__matches__ = iterable(this.__currentBracket__).flatten().toArray();
		}	
		return this.__matches__.shift();
	}
}); //// declare Elimination.


// See __prologue__.js
	return exports;
});

//# sourceMappingURL=ludorum.js.map