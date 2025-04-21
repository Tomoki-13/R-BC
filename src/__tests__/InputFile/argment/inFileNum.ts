export {};
function add(a:number, b:number) {
    return a + b;
}

add(10,9);

let c:number = 10;
let d:number = 10;
add(c,d);
c += 1;
add(c,d)
d -= 2;
add(c,d)
