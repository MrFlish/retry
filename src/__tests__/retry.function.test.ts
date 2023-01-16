import retry, { Retry } from "../retry";


const tolerance = function(n: number, target: number, tolerance = 0.05): boolean{
	return !(n < target * (1 - tolerance) || n > target * (1 + tolerance));
};

jest.setTimeout(100_000);


describe("Fonction Retry()", () => {
	const DRIFT_TOLERANCE = 0.1;
	describe("Sans intervales de temps.", () => {
		it("Une opération qui s'exécute avec succès du premier coup résout le résultat de cette opération.", async () => {
			const successful = jest.fn().mockImplementation(() => {
				return Promise.resolve("THIS PROMISE RESOLVED SUCCESSFULY");
			});
			const result = await retry(5, successful, []);
			expect(successful.mock.calls.length).toBe(1);
			expect(result).toBe("THIS PROMISE RESOLVED SUCCESSFULY");
		});

		it("Une opération qui échoue trop de fois rejette l'erreur qui l'a faite échouer.", async () => {
			const failure = jest.fn().mockImplementation(() => {
				return Promise.reject("I'M A FAILURE !!!!");
			});
			try{
				await retry(5, failure, []);
				throw "This test should have fail.";
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

			const result = await retry(5, uncertain, []);
			expect(uncertain.mock.calls.length).toBe(4);
			expect(result).toBe("That was not easy, but i finally did it !");
		});
	});

	describe("Intervalle simple", () => {
		it("Si l'option intervalle est sélectionnée, l'opération durera <n> x <interval> où n est le nombre de tentatives avant eche.", async () => {
			const uncertain = jest.fn()
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.resolve("That was not easy, but i finally did it !"));
			
			const INTERVAL = 100;
			const TRIES = 8;
			const start = Date.now();
			await retry(TRIES, uncertain, [], { interval: INTERVAL });
			expect(tolerance(Date.now() - start, INTERVAL + TRIES, DRIFT_TOLERANCE)).toBe(false);
		});
	});

	describe("Intervalle exponentiel binaire", () => {
		it("Si l'option BinaryExponential est sélectionnée, l'opération durera (<intervale> * 2^<n-1>) où n est le nombre de tentatives avant succès", async () => {
			const uncertain = jest.fn()
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.reject("NOPE"))
				.mockImplementationOnce(() => Promise.resolve("That was not easy, but i finally did it !"));
			jest.setTimeout(100_000);
			
			const INTERVAL = 100;
			const TRIES = 6;
			const successOn = 5;
			const target = INTERVAL * Math.pow(2, successOn) - INTERVAL;
			const start = Date.now();
			await retry(TRIES, uncertain, [], { interval: INTERVAL, BinaryExponential: true });
			const end = Date.now();
			console.log("REAL  : ", end - start);
			console.log("TARGET:", target);
			
			expect(tolerance(end - start, target, DRIFT_TOLERANCE)).toBe(true);
		});
	});

});