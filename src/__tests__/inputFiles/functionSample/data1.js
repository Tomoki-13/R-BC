function add(a, b) {
    return a + b;
}
export default add;
const subtract = function(a, b) {
    return a - b;
};
async function Data(c) {
    try {
        let response = await fetch(url);
        let data = await response.json();
        let a = add(add());
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        let a = add();
        throw error;
    }
}
export { subtract,Data };
const multiply = (a, b) => {
    let c = Func(add())
    return a * b;
};
module.exports.divide = function(a, b) {
    return a / b;
};
exports.power = (a, b) => {
    let c = add();
    return Math.pow(a, b);
};
export default class Calculator {
    add(a, b) {
        return a + b;
    }
}