import { Retry } from "../promises";


const tolerance = function(n: number, target: number, tolerance = 0.05): boolean{
	return !(n < target * (1 - tolerance) || n > target * (1 + tolerance));
};

describe("Classe Retry()", () => {
	const DRIFT_TOLERANCE = 0.1;
	describe("Méthode try() - Sans intervales de temps.", () => {
		it("Une opération qui s'exécute avec succès du premier coup résout le résultat de cette opération.", async () => {
			const successful = jest.fn().mockImplementation(() => {
				return Promise.resolve("THIS PROMISE RESOLVED SUCCESSFULY");
			});
			const execute = new Retry(successful, []);
			const result = await execute.try(5);
			expect(successful.mock.calls.length).toBe(1);
			expect(result).toBe("THIS PROMISE RESOLVED SUCCESSFULY");
		});

		it("Une opération qui échoue trop de fois rejette l'erreur qui l'a faite échouer.", async () => {
			const failure = jest.fn().mockImplementation(() => {
				return Promise.reject("I'M A FAILURE !!!!");
			});
			try{
				const execute = new Retry(failure, []);
				await execute.try(5);
				throw "This test should fail.";
			}
			catch(e){
				expect(failure.mock.calls.length).toBe(5);
				expect(e).toBe("I'M A FAILURE !!!!");
			}
		});

		it("Si l'opération réussit avant la limite d'échecs, résout le résultat de cette opération.", async () => {
			const uncertain = jest.fn()
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.resolve("That was not easy, but i finally did it !"));

			const execute = new Retry(uncertain, []);
			const result = await execute.try(5);
			expect(uncertain.mock.calls.length).toBe(4);
			expect(result).toBe("That was not easy, but i finally did it !");
		});
	});

	describe("Méthodes on et once()", () => {
		it("on('failure') sera déclenché autant de fois que l'opération échoue.", async () => {
			let n = 0;
			const uncertain = jest.fn()
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.resolve("That was not easy, but i finally did it !"));

			const execute = new Retry(uncertain, []);
			execute.on("failure", () => { ++n; });
			await execute.try(8);
			expect(n).toBe(5);
		});

		it("once('failure') ne sera déclenché qu'une seule fois, même si l'opération échoue plus d'une fois.", async () => {
			let n = 0;
			const uncertain = jest.fn()
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.resolve("That was not easy, but i finally did it !"));

			const execute = new Retry(uncertain, []);
			execute.once("failure", () => { ++n; });
			await execute.try(8);
			expect(n).toBe(1);
		});
	});

	describe("Intervalle simple", () => {
		it("Si l'option intervalle est sélectionnée, l'opération se relance un certain temps fixe après avoir échoué", async () => {
			const uncertain = jest.fn()
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.resolve("That was not easy, but i finally did it !"));
			
			const INTERVAL = 100;
			const execute = new Retry(uncertain, [], { interval: INTERVAL });
			const chronos: number[] = [];
			execute.on("failure", () => {     
				chronos.push(Date.now());
			});
			await execute.try(8);
			const ends: number[] = [];
			for(let i = 0; i < chronos.length -1; ++i){
				ends.push(chronos[i + 1] - chronos[i]);
			}
			const end = Date.now();
			ends.push(end - chronos[chronos.length -1]);
			expect(ends.some((v) => (!tolerance(v, INTERVAL, DRIFT_TOLERANCE)))).toBe(false);
		});
	});

	describe("Intervalle exponentiel", () => {
		it("Si l'option exponentielle est sélectionnée, l'opération se relance à un temps doublé du précédent après avoir échoué", async () => {
			const uncertain = jest.fn()
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.resolve("That was not easy, but i finally did it !"));
			
			const INTERVAL = 100;
			const EXPO = 2;
			const execute = new Retry(uncertain, [], { interval: INTERVAL, exponential: true, factor: EXPO });
			const ends: number[] = [];
			const chronos: number[] = [];
			const expected: number[] = [INTERVAL];
			execute.on("failure", () => { chronos.push(Date.now()); });
			await execute.try(5);
			const end = Date.now();
			for(let i = 0; i < chronos.length -1; ++i){
				ends.push((chronos[i + 1] - chronos[i]));
			}
			ends.push(end - chronos[chronos.length -1]);
			for(let i = 0; i < ends.slice(1).length; i++){
				expected.push(expected[expected.length - 1] * EXPO);
			}
			let result = false;
			for(let i = 0; i < expected.length; ++i){
				if(!tolerance(ends[i], expected[i], DRIFT_TOLERANCE)){
					result = true;
					break;
				}
			}
			expect(result).toBe(false);
		});
	});

});