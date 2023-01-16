import { Retry } from "../promises";


const tolerance = function(n: number, target: number, tolerance = 0.05): boolean{
	return !(n < target * (1 - tolerance) || n > target * (1 + tolerance));
};

describe("Classe Retry()", () => {
	const DRIFT_TOLERANCE = 0.05;
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
			execute.on("failure", (e, c, i) => { ++n; });
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
			execute.once("failure", (e, c, i) => { ++n; });
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
			let ends: number[] = [];
			let chronos: number[] = [];
			execute.on("failure", (e, c, i) => {     
				chronos.push(Date.now());
			});
			await execute.try(8);
			let end = Date.now();
			for(let i = 0; i < chronos.length -1; ++i){
				ends.push(chronos[i + 1] - chronos[i])
			}
			ends.push(end - chronos[chronos.length -1])
			expect(ends.some((v) => (!tolerance(v, INTERVAL, DRIFT_TOLERANCE)))).toBe(false);
			// expect(ends.some((v) => (v < INTERVAL * 0.98 || v > INTERVAL * 1.02))).toBe(false);
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
			execute.on("failure", (e, c, i) => { chronos.push(Date.now()); });
			await execute.try(5);
			let end = Date.now();
			for(let i = 0; i < chronos.length -1; ++i){ ends.push((chronos[i + 1] - chronos[i])); };
			ends.push(end - chronos[chronos.length -1]);
			ends.slice(1).forEach((d) => { expected.push(expected[expected.length - 1] * EXPO)});
			let result = false;
			for(let i = 0; i < expected.length; ++i){
				if(!tolerance(ends[i], expected[i], DRIFT_TOLERANCE)){
				// if(ends[i] < expected[i] * 0.95 || ends[i] > expected[i] * 1.05){
					result = true;
					break;
				}
			}
			expect(result).toBe(false);
		});
	});

});