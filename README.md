# Retry

## A typesafe promise based retry pattern.


### `retry` function
The `retry` function allows you to quickly retry a promise if it fails.
Import it into your project as follows

```js
import retry from "@mrflish/retry";
```

the `retry` function takes several parameters
the first one is the number of tries before giving up and returning the error that the function threw

```js
const result = await retry(num_of_tries, func_name, [func_param1, func_param2, ...], options);
```

`retry` will fail and throw if the function does not resolve before the maximum number of tries reaches its limit.

```js
import retry from "@mrflish/retry";

let count = 1;
const notSureIllResolve = async (param1: string, param2: number, param3: boolean[]) => {
	if(count < 5) 
		throw new Error(`Not yet... [${count++}]`);
	return `About time ! [${count}]`;
};


try {
    //the number of tries is not high enough to allow the function to resolve.
    //retry will throw at the end of the 4th try.
    const MAX_TRIES = 4;
    const result = await retry(MAX_TRIES, notSureIllResolve, ["value of param1", 42, [true, false]]);
    console.log(result);
    
} catch(error: any){
    console.log(error.message);
    //=> "Not yet... [4]"
}

```

`retry` will resolve if the function resolves before the maximum number of tries reaches its limit

```js
import retry from "@mrflish/retry";

let count = 1;
const notSureIllResolve = async (param1: string, param2: number, param3: boolean[]) => {
	if(count < 5) {
		throw new Error(`Not yet... [${count++}]`);
	}
	return `About time ! [${count}]`;
};


try {
    //retry will resolve at the 5th try
    //MAX_TRIES is high enough to let the the function resolve
    const MAX_TRIES = 6;
    const result = await retry(MAX_TRIES, notSureIllResolve, ["value of param1", 42, [true, false]]);
    console.log(result);
    //=> "About time ! [5]"
    
} catch(error: any){
    console.log(error.message);
}
```

### Retry class
The `Retry` class allows you to have more information about the execution of the function
Import it into your project as follows

```js
import { Retry } from "@mrflish/retry";
```

the `Retry` construcor takes several parameters
the first one is the function to try to run

```js
import { Retry } from "@mrflish/retry";
const execute = new Retry(func_name, [func_param1, func_param2, ...], options);
try {
	//the number of tries is not high enough to allow the function to resolve.
	//retry will throw at the end of the 4th try.
	const MAX_TRIES = 4;

    //Will trigger this event each time it tries again
	execute.on("retry", (countDown, currentInterval) => {
		/* Some things to do on each retry here */
	});

    //Will try trigger this event each time it fails
    execute.on("failure", (error, countDown, currentInterval) => {
		/* Some things to do on each failure here */
	});

	const result = await execute.try(MAX_TRIES);

	console.log(result);
		
} catch(error: any){
	console.log(error.message);
	//=> "Not yet... [4]"
}
```

### options
Whether you use the function or the class, you can specify two options: 
- #### interval
The interval option allows you to specify how long (in milliseconds) to wait before retrying after a failure.
Set to 100ms by default
```js
const MAX_TRIES = 4;
const execute = new Retry(notSureIllResolve, ["value of param1", 42, [true, false]], { interval: 500 });

execute.on("retry", (countDown, currentInterval) => {
    console.log(count, currentInterval);
    console.log(`${count} -> ${currentInterval}`);
    /* Some things to do on each retry here */
});

const result = await execute.try(MAX_TRIES);

//OUTPUT
//4 -> 500
//3 -> 500
//2 -> 500
//Not yet... [4]
```

#### BinaryExponential
If the binaryExponential option is set to true, each new trial will have its time interval doubled.
Set to false by default
```js
const MAX_TRIES = 5;
const execute = new Retry(notSureIllResolve, ["value of param1", 42, [true, false]], { interval: 500, BinaryExponential: true });

execute.on("retry", (countDown, currentInterval) => {
    console.log(count, currentInterval);
    console.log(`${count} -> ${currentInterval}`);
    /* Some things to do on each retry here */
});

const result = await execute.try(MAX_TRIES);

//OUTPUT
//5 -> 500
//4 -> 1000
//3 -> 2000
//2 -> 4000
//About time ! [5]
```
