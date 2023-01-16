import { EventEmitter } from "events";

interface RetryOptions {
	interval: number,
	exponential: boolean,
	factor: number
}

const DEFAULT_OPTIONS: RetryOptions = {
	interval: 0,
	exponential: false,
	factor: 2
};


/**Allows you to retry an async function while it fails until the max number of tries have been reached. */
export class Retry< T extends (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> > {
	private _target: T;
	private _parameters: Parameters<T>;
	private _options: RetryOptions;
	private _event: EventEmitter;
	
	/**
	 * Allows you to retry an async function while it fails until the max number of tries have been reached
	 * @param target async function to execute until it succeeds.
	 * @param parameters parameters of the async function to execute.
	*/
	constructor(target: T, parameters: Parameters<T>, options: Partial<RetryOptions> = {}){
		this._target = target;
		this._parameters = parameters;
		this._options = Object.assign({ ...DEFAULT_OPTIONS }, options);
		this._event = new EventEmitter();
	}

	/**
	 * Tries to execute the async function. If it fails, tries again until it succeeds, or until the max number of tries have been reached.
	 * @param tries Max number of tries before rejecting.
	 * @returns 
	*/
	public async try(tries: number): Promise<Awaited<ReturnType<T>>>{
		const retry = async(i: number, target: T, ...parameters: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
			try {
				const data = await target(...parameters);
				return data;
			}
			catch (e) {
				this._event.emit("failure", e, i, this._options.interval);
				if (i <= 1) throw e;
				this._event.emit("retry", i, this._options.interval);
				if(this._options.interval > 0){
					await new Promise(resolve => setTimeout(resolve, this._options.interval));
					this._updateInterval();
				}
				return retry(i - 1, target, ...parameters);
			}
		};
		
		return retry(tries, this._target, ...this._parameters);
	}

	private _updateInterval(): number{
		this._options.interval = this._options.exponential ? this._options.interval * this._options.factor : this._options.interval;
		return this._options.interval;
	}
	
	/**
	 * Runs the given callback function `cb` each time the specified event is triggered
	 * @param event Event to monitor
	 * @param cb Callback function to run
	 * @returns 
	 */
	on(event: "failure", cb: (error: unknown, countdown: number, currentInterval: number) => void): this;
	on(event: "retry", cb: (countdown: number, currentInterval: number) => void): this;
	//eslint-disable-next-line
	public on(event: string, cb: (...args: any) => void): this {
		this._event.on(event, cb);
		return this;
	}

	/**
	 * Runs the given callback function `cb` on the first time the specified event is triggered
	 * @param event Event to monitor
	 * @param cb Callback function to run
	 * @returns 
	 */
	once(event: "failure", cb: (error: unknown, countdown: number, currentInterval: number) => void): this
	once(event: "retry", cb: (countdown: number, currentInterval: number) => void): this
	//eslint-disable-next-line
	public once(event: string, cb: (...args: any[]) => void): this {
		this._event.once(event, cb);
		return this;
	}
}

/**
 * Tries to execute the given target until it succeeds or until the max number of tries have been reached.
 * @param tries Max number of tries before rejecting.
 * @param target An async function to execute.
 * @param parameters Parameters of the async function.
 * @param options Options for subsequent tries behavior
 * @returns A Promise resolved if the function could be executed successfully.
*/
export default function retry< T extends (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> >
(tries: number, target: T, parameters: Parameters<T>, options?: Partial<RetryOptions>){
	const r = new Retry(target, parameters, options);
	return r.try(tries);
}