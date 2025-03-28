import _ from "lodash";

/**
 * Increments counter for permutation generation
 */
function inc(counter: number[], i: number, offset: number): boolean {
  const max = offset + i;

  counter[i]++;

  if (counter[i] >= max) {
    if (i === 0) {
      return true;
    }

    if (inc(counter, i - 1, offset)) {
      return true;
    }

    counter[i] = counter[i - 1] + 1;
  }

  return false;
}

/**
 * Stream permutations of k elements from an array
 */
function* permStream(arr: number[], k: number): Generator<number> {
  const counter = _.range(k);

  while (true) {
    for (const val of counter) {
      yield arr[val];
    }

    if (inc(counter, k - 1, arr.length - k + 1)) {
      break;
    }
  }
}

/**
 * Generate permutations of k elements from n elements
 */
export function permute(n: number, k: number, callback: (perm: number[]) => void): void {
  const arr = _.range(n);

  let total = 0;
  const permutation: number[] = new Array(k);

  const generator = permStream(arr, k);
  let result = generator.next();

  while (!result.done) {
    const i = total % k;
    permutation[i] = result.value;

    if (i === k - 1) {
      callback([...permutation]);
    }

    total++;
    result = generator.next();
  }
}
