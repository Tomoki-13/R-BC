function add(a, b) {
    return a + b;
}
const multiply = function(x, y) {
    return x * y;
};

const subtract = (a, b) => {
    return a - b;
};
const square = x => x * x;
const divide = function divideFn(x, y) {
    return x / y;
};
function* fibonacci() {
    let a = 0, b = 1;
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}
async function fetchData(url) {
    try {
        let response = await fetch(url);
        let data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}
export default divide;
export{fetchData,square}