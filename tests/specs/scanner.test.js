﻿define(['creatartis-base', 'ludorum'], function (base, ludorum) {
	
	describe("Scanner", function () {
		it("scans games.Predefined", function (done) {
			var scanner = new ludorum.utils.Scanner({ 
					game: new ludorum.games.Predefined('A', {A: 1, B:-1}, 6, 5),
					maxWidth: 50,
					maxLength: 10
				}),
				scan = scanner.scan();
			expect(scan).toBeOfType(base.Future);
			return scan.then(function (stats) {
				expect(stats.average({key:'game.result'})).toBe(0);
				expect(stats.average({key:'game.result', role:'A'})).toBe(1);
				expect(stats.count({key:'victory.result', role:'A'}))
					.toEqual(stats.count({key:'victory.result'}));
				expect(stats.average({key:'game.result', role:'B'})).toBe(-1);
				expect(stats.count({key:'defeat.result', role:'B'}))
					.toEqual(stats.count({key:'defeat.result'}));
				expect(stats.count({key:'draw.length'})).toBe(0);
				expect(stats.average({key:'game.width'})).toBe(5);
				expect(stats.average({key:'game.length'})).toBe(6);
				expect(stats.average({key:'aborted'})).toBe(0);
				done();
			});
		}); //// scans games.Predefined
	
		it("scans games.Choose2Win", function (done) {
			var scanner = new ludorum.utils.Scanner({ 
					game: new ludorum.games.Choose2Win(),
					maxWidth: 50,
					maxLength: 10
				}),
				scan = scanner.scan();
			expect(scan).toBeOfType(base.Future);
			return scan.then(function (stats) {
				expect(stats.average({key:'game.result'})).toBe(0);
				expect(stats.average({key:'game.result', role:'This'})).toBe(0);
				expect(stats.maximum({key:'game.result', role:'This'})).toBe(1);
				expect(stats.minimum({key:'game.result', role:'This'})).toBe(-1);
				expect(stats.average({key:'game.result', role:'That'})).toBe(0);
				expect(stats.maximum({key:'game.result', role:'That'})).toBe(1);
				expect(stats.minimum({key:'game.result', role:'That'})).toBe(-1);
				expect(stats.count({key:'draw.length'})).toBe(0);
				expect(stats.average({key:'game.width'})).toBe(3);
				expect(stats.average({key:'aborted'})).toBe(3);
				done();
			});
		}); //// scans games.Choose2Win
		
		it("scans games.Predefined with RandomPlayer", function (done) {
			var scanner = new ludorum.utils.Scanner({ 
					game: new ludorum.games.Predefined('A', {A: 1, B:-1}, 6, 5),
					maxWidth: 50,
					maxLength: 10
				}),
				player = new ludorum.players.RandomPlayer(),
				scans = scanner.scans({'A': player}, {'B': player});
			expect(scans).toBeOfType(base.Future);
			return scans.then(function (stats) {
				expect(stats.average({key:'game.result'})).toBe(0);
				expect(stats.average({key:'game.result', role:'A'})).toBe(1);
				expect(stats.count({key:'victory.result', role:'A'}))
					.toEqual(stats.count({key:'victory.result'}));
				expect(stats.average({key:'game.result', role:'B'})).toBe(-1);
				expect(stats.count({key:'defeat.result', role:'B'}))
					.toEqual(stats.count({key:'defeat.result'}));
				expect(stats.count({key:'draw.length'})).toBe(0);
				expect(stats.average({key:'game.width'})).toBe(5);
				expect(stats.average({key:'game.length'})).toBe(6);
				expect(stats.average({key:'aborted'})).toBe(0);
				done();
			});
		}); //// scans games.Predefined with RandomPlayer
	}); // describe Scanner

}); //// define.