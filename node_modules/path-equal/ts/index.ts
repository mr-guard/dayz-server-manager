/**
 * Compare if the two file paths are considered equal.
 */
export function pathEqual(actual: string, expected: string): boolean {
  return (actual === expected) || (normalizePath(actual) === normalizePath(expected))
}

function normalizePath(path: string): string {
  const replace: [RegExp, string][] = [
    [/\\/g, '/'],
    [/(\w):/, '/$1'],
    [/(\w+)\/\.\.\/?/g, ''],
    [/^\.\//, ''],
    [/\/\.\//, '/'],
    [/\/\.$/, ''],
    [/\/$/, ''],
  ];

  replace.forEach(array => {
    while (array[0].test(path)) {
      path = path.replace(array[0], array[1])
    }
  })

  return path
}
