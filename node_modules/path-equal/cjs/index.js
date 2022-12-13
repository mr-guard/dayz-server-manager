"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathEqual = void 0;
/**
 * Compare if the two file paths are considered equal.
 */
function pathEqual(actual, expected) {
    return (actual === expected) || (normalizePath(actual) === normalizePath(expected));
}
exports.pathEqual = pathEqual;
function normalizePath(path) {
    var replace = [
        [/\\/g, '/'],
        [/(\w):/, '/$1'],
        [/(\w+)\/\.\.\/?/g, ''],
        [/^\.\//, ''],
        [/\/\.\//, '/'],
        [/\/\.$/, ''],
        [/\/$/, ''],
    ];
    replace.forEach(function (array) {
        while (array[0].test(path)) {
            path = path.replace(array[0], array[1]);
        }
    });
    return path;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7R0FFRztBQUNILFNBQWdCLFNBQVMsQ0FBQyxNQUFjLEVBQUUsUUFBZ0I7SUFDeEQsT0FBTyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtBQUNyRixDQUFDO0FBRkQsOEJBRUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFZO0lBQ2pDLElBQU0sT0FBTyxHQUF1QjtRQUNsQyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7UUFDWixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUM7UUFDaEIsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUM7UUFDdkIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ2IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO1FBQ2YsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ2IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO0tBQ1osQ0FBQztJQUVGLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLO1FBQ25CLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMxQixJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FDeEM7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sSUFBSSxDQUFBO0FBQ2IsQ0FBQyJ9