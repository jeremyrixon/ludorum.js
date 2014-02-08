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
				ply++;
			});
		}).then(function () {
			scanner.statistics.add(['aborted'], window.length);
			return scanner.statistics;
		});
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
			return iterable(game.distribution()).map(function (value) {
				return game.next(value[0]);
			});
		} else if (this.account(players, game, ply)) {
			return Iterable.EMPTY;
		} else {
			var scanner = this,
				moves = game.moves();
			return Future.all(game.activePlayers.map(function (activePlayer) {
				if (players && players[activePlayer]) {
					var decisionTime = stats.stat(['decision.time', 'game:'+ game.name, 'role:'+ role, 'player:'+ p]);
					decisionTime.startTime();
					return Future.when(players[activePlayer].decision(game, activePlayer)).then(function (move) {
						decisionTime.addTime();
						return [move];
					});
				} else {
					return moves[activePlayer];
				}
			})).then(function (decisions) {
				return Iterable.product.apply(this, decisions).map(function (moves) {
					return game.next(iterable(game.activePlayers).zip(moves).toObject());
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
					p = players && players[role] ? players[role].name : '',
					keys = ['game:'+ game.name, 'role:'+ role, 'player:'+ p];
				stats.add(['game.result'].concat(keys), r, game);
				stats.add(['game.length'].concat(keys), ply, game);
				if (r < 0) {
					stats.add(['defeat.result'].concat(keys), r, game);
					stats.add(['defeat.length'].concat(keys), ply, game);
				} else if (r > 0) {
					stats.add(['victory.result'].concat(keys), r, game);
					stats.add(['victory.length'].concat(keys), ply, game);
				} else {
					stats.add(['draw.length'].concat(keys), ply, game);
				}
			});
			return true;
		} else {
			var moves = game.moves();
			iterable(game.activePlayers).forEach(function (role) {
				stats.add(['game.width', 'game:'+ game.name, 'role:'+ role], moves[role].length);
			});
			return false;
		}
	}
}); // declare utils.Scanner.