/**
 * Compare if the two file paths are considered equal.
 */
export function pathEqual(actual, expected) {
    return (actual === expected) || (normalizePath(actual) === normalizePath(expected));
}
function normalizePath(path) {
    const replace = [
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
            path = path.replace(array[0], array[1]);
        }
    });
    return path;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQUMsTUFBYyxFQUFFLFFBQWdCO0lBQ3hELE9BQU8sQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7QUFDckYsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQVk7SUFDakMsTUFBTSxPQUFPLEdBQXVCO1FBQ2xDLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztRQUNaLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQztRQUNoQixDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztRQUN2QixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDYixDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUM7UUFDZixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDYixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7S0FDWixDQUFDO0lBRUYsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUN0QixPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDMUIsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQ3hDO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLElBQUksQ0FBQTtBQUNiLENBQUMifQ==